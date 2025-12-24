import { Worker, Job } from 'bullmq';
import {
  StencilJobData,
  EnhanceJobData,
  IaGenJobData,
  ColorMatchJobData,
} from './queue';
import { generateStencilFromImage, enhanceImage, generateTattooIdea, analyzeImageColors } from './gemini';
import { consumeOperation } from './credits';
import { supabaseAdmin } from './supabase';
import { Redis } from 'ioredis';

/**
 * Workers que processam jobs em background
 *
 * IMPORTANTE: Em produção, rodar workers em processos separados
 * ou em workers do Vercel/Railway
 */

// Mesma configuração de Redis
const redisConnection = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      host: process.env.UPSTASH_REDIS_REST_URL!.replace('https://', '').replace(
        'http://',
        ''
      ),
      port: 6379,
      password: process.env.UPSTASH_REDIS_REST_TOKEN!,
      tls: process.env.UPSTASH_REDIS_REST_URL?.startsWith('https') ? {} : undefined,
      maxRetriesPerRequest: null,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

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

      // 3. Consumir crédito
      await job.updateProgress(80);
      const consumeResult = await consumeOperation(userId, operationType);

      if (!consumeResult.success) {
        console.error(`[Worker] Erro ao consumir crédito: ${consumeResult.error}`);
        // Não falhar o job por isso, apenas logar
      }

      // 4. Salvar no banco (opcional - para histórico)
      await job.updateProgress(90);

      // Buscar user ID (UUID) do banco
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

      if (user) {
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
    concurrency: 5, // Processar até 5 jobs em paralelo
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
      await consumeOperation(userId, 'enhance');

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
    concurrency: 3,
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
      await consumeOperation(userId, 'ia_gen');

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
    concurrency: 3,
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
      await consumeOperation(userId, 'color_match');

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
