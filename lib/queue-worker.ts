import { Worker, Job, ConnectionOptions } from 'bullmq';
import {
  StencilJobData,
  EnhanceJobData,
  IaGenJobData,
  ColorMatchJobData,
} from './queue';
import { generateStencilFromImage, enhanceImage, generateTattooIdea, analyzeImageColors } from './gemini';
import { recordUsage } from './billing/limits';
import { BRL_COST } from './billing/costs';
import { supabaseAdmin } from './supabase';

/**
 * Workers que processam jobs em background
 *
 * IMPORTANTE: Em produção, rodar workers em processos separados
 * ou em workers do Vercel/Railway
 *
 * 🚀 MIGRAÇÃO: Upstash → Railway Redis
 * - Workers agora usam Railway Redis (TCP nativo)
 * - Configuração idêntica ao queue.ts para garantir compatibilidade
 */

// Railway Redis Connection (mesma do queue.ts)
// Parser manual para evitar conflito de versões do ioredis
function parseRedisUrl(url: string): ConnectionOptions {
  const urlObj = new URL(url);
  const isTls = urlObj.protocol === 'rediss:';

  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port) || 6379,
    password: urlObj.password || undefined,
    username: urlObj.username || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false, // Melhora estabilidade em algumas clouds
    keepAlive: 10000, // Enviar keep-alive a cada 10s para evitar timeout
    tls: isTls ? {
      rejectUnauthorized: false // Aceitar certificados self-signed (comum em clouds)
    } : undefined,
    retryStrategy: (times) => {
      // Retry com backoff exponencial: 50, 100, 200, 400, 800... max 2s
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  };
}

const redisConnection: ConnectionOptions = process.env.REDIS_URL
  ? parseRedisUrl(process.env.REDIS_URL)
  : {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };

console.log('[Workers] Configurando workers com Railway Redis:',
  process.env.REDIS_URL ? '✅ Conectado' : '⚠️ Usando localhost'
);

// ============================================
// WORKER: STENCIL GENERATION
// ============================================

export const stencilWorker = new Worker<StencilJobData>(
  'stencil-generation',
  async (job: Job<StencilJobData>) => {
    const { userId, image, style, promptDetails, operationType } = job.data;

    console.log(`[Worker] Processando job ${job.id} para user ${userId}`);

    try {
      // 1. Atualizar progresso: começando
      await job.updateProgress(10);

      // 2. Gerar stencil
      await job.updateProgress(30);
      const stencilImage = await generateStencilFromImage(image, promptDetails, style);

      // 3. Buscar user ID (UUID) do banco
      await job.updateProgress(80);

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      // 4. Registrar uso
      if (user) {
        await recordUsage({
          userId: user.id,
          type: 'editor_generation',
          operationType: operationType || 'generate_stencil',
          cost: style === 'perfect_lines' ? BRL_COST.lines : BRL_COST.topographic,
          metadata: {
            style: style === 'perfect_lines' ? 'perfect_lines' : 'standard',
            operation: operationType,
            via: 'queue'
          }
        });

        // Salvar no banco (opcional - para histórico)
        await job.updateProgress(90);

        await supabaseAdmin.from('projects').insert({
          user_id: user.id,
          name: `Stencil ${new Date().toLocaleDateString()}`,
          original_image: image.substring(0, 100) + '...', // Truncar para não sobrecarregar
          stencil_image: stencilImage.substring(0, 100) + '...',
          style: style === 'perfect_lines' ? 'perfect_lines' : 'standard',
        });
      }

      // 5. Concluído
      await job.updateProgress(100);

      console.log(`[Worker] Job ${job.id} concluído com sucesso`);

      return {
        success: true,
        image: stencilImage,
        userId,
      };
    } catch (error: any) {
      console.error(`[Worker] Erro no job ${job.id}:`, error);
      throw error; // BullMQ vai fazer retry automaticamente
    }
  },
  {
    connection: redisConnection,
    // Concorrência configurável via ENV (Padrão: 5)
    // Para escalar no Railway, aumente WORKER_CONCURRENCY_STENCIL
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_STENCIL || '5'),
    limiter: {
      max: 10, // Máximo 10 jobs
      duration: 60000, // por minuto
    },
  }
);

// ============================================
// WORKER: ENHANCE
// ============================================

export const enhanceWorker = new Worker<EnhanceJobData>(
  'enhance',
  async (job: Job<EnhanceJobData>) => {
    const { userId, image } = job.data;

    console.log(`[Worker] Processando enhance ${job.id}`);

    try {
      await job.updateProgress(20);
      const enhancedImage = await enhanceImage(image);

      await job.updateProgress(80);

      // Buscar UUID do usuário
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (user) {
        await recordUsage({
          userId: user.id,
          type: 'tool_usage',
          operationType: 'enhance_image',
          cost: BRL_COST.enhance,
          metadata: {
            tool: 'enhance',
            via: 'queue',
            operation: 'enhance_image'
          }
        });
      }

      await job.updateProgress(100);

      return {
        success: true,
        image: enhancedImage,
        userId,
      };
    } catch (error: any) {
      console.error(`[Worker] Erro no enhance ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_ENHANCE || '3'),
  }
);

// ============================================
// WORKER: IA GEN
// ============================================

export const iaGenWorker = new Worker<IaGenJobData>(
  'ia-gen',
  async (job: Job<IaGenJobData>) => {
    const { userId, prompt, size } = job.data;

    console.log(`[Worker] Processando IA Gen ${job.id}`);

    try {
      await job.updateProgress(20);
      const generatedImage = await generateTattooIdea(prompt, size);

      await job.updateProgress(80);

      // Buscar UUID do usuário
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (user) {
        await recordUsage({
          userId: user.id,
          type: 'ai_request',
          operationType: 'ia_gen',
          cost: BRL_COST.ia_gen,
          metadata: {
            operation: 'ia_gen',
            prompt_length: prompt.length,
            via: 'queue'
          }
        });
      }

      await job.updateProgress(100);

      return {
        success: true,
        image: generatedImage,
        userId,
      };
    } catch (error: any) {
      console.error(`[Worker] Erro no IA Gen ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_GEN || '3'),
  }
);

// ============================================
// WORKER: COLOR MATCH
// ============================================

export const colorMatchWorker = new Worker<ColorMatchJobData>(
  'color-match',
  async (job: Job<ColorMatchJobData>) => {
    const { userId, image } = job.data;

    console.log(`[Worker] Processando Color Match ${job.id}`);

    try {
      await job.updateProgress(30);
      const colors = await analyzeImageColors(image);

      await job.updateProgress(80);

      // Buscar UUID do usuário
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (user) {
        await recordUsage({
          userId: user.id,
          type: 'tool_usage',
          operationType: 'color_match',
          cost: BRL_COST.color_match,
          metadata: {
            tool: 'color_match',
            via: 'queue',
            operation: 'color_match'
          }
        });
      }

      await job.updateProgress(100);

      return {
        success: true,
        colors,
        userId,
      };
    } catch (error: any) {
      console.error(`[Worker] Erro no Color Match ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10, // Color match é rápido
  }
);

// ============================================
// EVENT HANDLERS
// ============================================

// Logs de eventos importantes
stencilWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completado`);
});

stencilWorker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} falhou:`, err.message);
});

stencilWorker.on('error', (err) => {
  console.error('[Worker] ⚠️ Erro no worker:', err);
});

enhanceWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Enhance ${job.id} completado`);
});

iaGenWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ IA Gen ${job.id} completado`);
});

colorMatchWorker.on('completed', (job) => {
  console.log(`[Worker] ✅ Color Match ${job.id} completado`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown() {
  console.log('[Worker] Iniciando shutdown gracioso...');

  await Promise.all([
    stencilWorker.close(),
    enhanceWorker.close(),
    iaGenWorker.close(),
    colorMatchWorker.close(),
  ]);

  console.log('[Worker] Workers fechados com sucesso');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Para iniciar todos os workers
export function startAllWorkers() {
  console.log('[Worker] 🚀 Iniciando todos os workers...');
  console.log('[Worker] - Stencil Worker: concurrency 5');
  console.log('[Worker] - Enhance Worker: concurrency 3');
  console.log('[Worker] - IA Gen Worker: concurrency 3');
  console.log('[Worker] - Color Match Worker: concurrency 10');
}
