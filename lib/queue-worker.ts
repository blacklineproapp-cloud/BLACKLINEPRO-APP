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
 * Workers que processam jobs em background (Railway)
 *
 * Correções aplicadas:
 * - retryStrategy com limite máximo de tentativas (evita loop infinito)
 * - Error handlers em TODOS os workers (evita crash por unhandled error)
 * - Graceful shutdown com timeout (evita hang no SIGTERM)
 * - Conexão Redis com reconnectOnError seletivo
 */

// ============================================
// CONFIGURAÇÃO DO REDIS
// ============================================

const MAX_REDIS_RETRIES = 20; // Máximo de tentativas de reconexão antes de desistir

function parseRedisUrl(url: string): ConnectionOptions {
  const urlObj = new URL(url);
  const isTls = urlObj.protocol === 'rediss:';

  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port) || 6379,
    password: urlObj.password || undefined,
    username: urlObj.username || undefined,
    maxRetriesPerRequest: null, // BullMQ exige null
    enableReadyCheck: false,
    keepAlive: 30000, // Keep-alive a cada 30s (mais conservador)
    connectTimeout: 15000, // 15s para conectar
    // Sem commandTimeout — BullMQ usa comandos blocking (BRPOPLPUSH/BZPOPMIN)
    // que podem demorar tempo indeterminado. ioredis commandTimeout interfere.
    tls: isTls ? {
      rejectUnauthorized: false,
    } : undefined,
    retryStrategy: (times: number) => {
      if (times > MAX_REDIS_RETRIES) {
        console.error(`[Workers] Redis: ${times} tentativas falharam. Encerrando processo.`);
        // Retornar null para parar de reconectar
        // O processo será encerrado pelo health check abaixo
        return null;
      }
      const delay = Math.min(times * 100, 5000); // Backoff: 100, 200, 300... max 5s
      console.warn(`[Workers] Redis reconectando (tentativa ${times}/${MAX_REDIS_RETRIES}), delay: ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      // Reconectar apenas em erros de conexão, não em erros de comando
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
      return targetErrors.some(e => err.message.includes(e));
    },
  };
}

const redisConnection: ConnectionOptions = process.env.REDIS_URL
  ? parseRedisUrl(process.env.REDIS_URL)
  : {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };

console.log('[Workers] Redis config:', process.env.REDIS_URL ? 'Railway Redis' : 'localhost');

// ============================================
// WORKERS
// ============================================

let allWorkers: Worker[] = [];
let isShuttingDown = false;

export const stencilWorker = new Worker<StencilJobData>(
  'stencil-generation',
  async (job: Job<StencilJobData>) => {
    const { userId, image, style, promptDetails, operationType } = job.data;

    console.log(`[Worker] Processando job ${job.id} para user ${userId}`);

    try {
      await job.updateProgress(10);

      await job.updateProgress(30);
      const stencilImage = await generateStencilFromImage(image, promptDetails, style);

      await job.updateProgress(80);

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', userId)
        .single();

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

        await job.updateProgress(90);

        await supabaseAdmin.from('projects').insert({
          user_id: user.id,
          name: `Stencil ${new Date().toLocaleDateString()}`,
          original_image: image.substring(0, 100) + '...',
          stencil_image: stencilImage.substring(0, 100) + '...',
          style: style === 'perfect_lines' ? 'perfect_lines' : 'standard',
        });
      }

      await job.updateProgress(100);
      console.log(`[Worker] Job ${job.id} concluido com sucesso`);

      return { success: true, image: stencilImage, userId };
    } catch (error: any) {
      console.error(`[Worker] Erro no job ${job.id}:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_STENCIL || '5'),
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

export const enhanceWorker = new Worker<EnhanceJobData>(
  'enhance',
  async (job: Job<EnhanceJobData>) => {
    const { userId, image } = job.data;
    console.log(`[Worker] Processando enhance ${job.id}`);

    try {
      await job.updateProgress(20);
      const enhancedImage = await enhanceImage(image);
      await job.updateProgress(80);

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
          metadata: { tool: 'enhance', via: 'queue', operation: 'enhance_image' }
        });
      }

      await job.updateProgress(100);
      return { success: true, image: enhancedImage, userId };
    } catch (error: any) {
      console.error(`[Worker] Erro no enhance ${job.id}:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_ENHANCE || '3'),
  }
);

export const iaGenWorker = new Worker<IaGenJobData>(
  'ia-gen',
  async (job: Job<IaGenJobData>) => {
    const { userId, prompt, size } = job.data;
    console.log(`[Worker] Processando IA Gen ${job.id}`);

    try {
      await job.updateProgress(20);
      const generatedImage = await generateTattooIdea(prompt, size);
      await job.updateProgress(80);

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
          metadata: { operation: 'ia_gen', prompt_length: prompt.length, via: 'queue' }
        });
      }

      await job.updateProgress(100);
      return { success: true, image: generatedImage, userId };
    } catch (error: any) {
      console.error(`[Worker] Erro no IA Gen ${job.id}:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_GEN || '3'),
  }
);

export const colorMatchWorker = new Worker<ColorMatchJobData>(
  'color-match',
  async (job: Job<ColorMatchJobData>) => {
    const { userId, image } = job.data;
    console.log(`[Worker] Processando Color Match ${job.id}`);

    try {
      await job.updateProgress(30);
      const colors = await analyzeImageColors(image);
      await job.updateProgress(80);

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
          metadata: { tool: 'color_match', via: 'queue', operation: 'color_match' }
        });
      }

      await job.updateProgress(100);
      return { success: true, colors, userId };
    } catch (error: any) {
      console.error(`[Worker] Erro no Color Match ${job.id}:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// Registrar todos os workers
allWorkers = [stencilWorker, enhanceWorker, iaGenWorker, colorMatchWorker];

// ============================================
// EVENT HANDLERS (TODOS os workers)
// ============================================

const workerNames: Record<string, string> = {
  'stencil-generation': 'Stencil',
  'enhance': 'Enhance',
  'ia-gen': 'IA Gen',
  'color-match': 'Color Match',
};

for (const worker of allWorkers) {
  const name = workerNames[worker.name] || worker.name;

  worker.on('completed', (job) => {
    console.log(`[${name}] Job ${job.id} completado`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${name}] Job ${job?.id} falhou: ${err.message}`);
  });

  worker.on('error', (err) => {
    // Tratar erros de conexão sem crashar
    if (isShuttingDown) return;
    console.error(`[${name}] Erro no worker: ${err.message}`);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[${name}] Job ${jobId} ficou stalled (possivel crash anterior)`);
  });
}

// ============================================
// GRACEFUL SHUTDOWN (com timeout)
// ============================================

const SHUTDOWN_TIMEOUT_MS = 10000; // 10s max para encerrar

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return; // Evitar dupla execução
  isShuttingDown = true;

  console.log(`[Workers] ${signal} recebido. Encerrando workers...`);

  // Timeout de seguranca: se workers nao fecharem em 10s, force exit
  const forceExit = setTimeout(() => {
    console.error('[Workers] Timeout no shutdown. Forcando saida.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    await Promise.allSettled(allWorkers.map(w => w.close()));
    console.log('[Workers] Workers fechados com sucesso');
  } catch (err: any) {
    console.error('[Workers] Erro ao fechar workers:', err.message);
  }

  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================
// INICIALIZAÇÃO
// ============================================

export function startAllWorkers() {
  console.log('[Workers] Iniciando todos os workers...');
  console.log(`[Workers] - Stencil: concurrency ${process.env.WORKER_CONCURRENCY_STENCIL || '5'}`);
  console.log(`[Workers] - Enhance: concurrency ${process.env.WORKER_CONCURRENCY_ENHANCE || '3'}`);
  console.log(`[Workers] - IA Gen: concurrency ${process.env.WORKER_CONCURRENCY_GEN || '3'}`);
  console.log('[Workers] - Color Match: concurrency 10');
}
