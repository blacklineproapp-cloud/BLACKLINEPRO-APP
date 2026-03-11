import { Worker, Job } from 'bullmq';
import {
  StencilJobData,
  EnhanceJobData,
  IaGenJobData,
  ColorMatchJobData,
} from './queue';
import { generateStencilFromImage, enhanceImage, generateTattooIdea, analyzeImageColors } from './gemini';
import { recordUsage } from './billing/limits';
import { BRL_COST } from './billing/costs';
import { logger } from './logger';
import { supabaseAdmin } from './supabase';
import { getRedisConnection } from './redis-utils';
import { WORKER_CONCURRENCY } from './constants/limits';
import { TIMEOUTS } from './constants/timeouts';

/**
 * Workers que processam jobs em background (Railway)
 *
 * - Error handlers em TODOS os workers (evita crash por unhandled error)
 * - Graceful shutdown com timeout (evita hang no SIGTERM)
 * - Conexão Redis com reconnectOnError seletivo
 */

const redisConnection = getRedisConnection();

// ============================================
// JOB HISTORY (in-memory ring buffer)
// ============================================

interface JobHistoryEntry {
  jobId: string;
  queue: string;
  status: 'completed' | 'failed' | 'stalled';
  timestamp: number;
  duration?: number;
  error?: string;
}

const jobHistory: JobHistoryEntry[] = [];
const MAX_HISTORY = 500;

/** Track job start times for duration calculation */
const jobStartTimes = new Map<string, number>();

function addJobHistoryEntry(entry: JobHistoryEntry) {
  jobHistory.push(entry);
  if (jobHistory.length > MAX_HISTORY) {
    jobHistory.splice(0, jobHistory.length - MAX_HISTORY);
  }
}

/**
 * Returns recent job history entries (newest first)
 */
export function getJobHistory(limit?: number): JobHistoryEntry[] {
  const entries = [...jobHistory].reverse();
  return limit ? entries.slice(0, limit) : entries;
}

// ============================================
// WORKERS
// ============================================

let allWorkers: Worker[] = [];
let isShuttingDown = false;

export const stencilWorker = new Worker<StencilJobData>(
  'stencil-generation',
  async (job: Job<StencilJobData>) => {
    const { userId, image, style, promptDetails, operationType } = job.data;
    if (job.id) jobStartTimes.set(job.id, Date.now());

    logger.info('[Worker] Processando job stencil', { jobId: job.id, userId });

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
      logger.info('[Worker] Job stencil concluído', { jobId: job.id });

      return { success: true, image: stencilImage, userId };
    } catch (error: unknown) {
      logger.error('[Worker] Erro no job stencil', error, { jobId: job.id });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_STENCIL || String(WORKER_CONCURRENCY.STENCIL_DEFAULT)),
    limiter: WORKER_CONCURRENCY.STENCIL_LIMITER,
  }
);

export const enhanceWorker = new Worker<EnhanceJobData>(
  'enhance',
  async (job: Job<EnhanceJobData>) => {
    const { userId, image } = job.data;
    if (job.id) jobStartTimes.set(job.id, Date.now());
    logger.info('[Worker] Processando enhance', { jobId: job.id });

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
    } catch (error: unknown) {
      logger.error('[Worker] Erro no enhance', error, { jobId: job.id });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_ENHANCE || String(WORKER_CONCURRENCY.ENHANCE_DEFAULT)),
  }
);

export const iaGenWorker = new Worker<IaGenJobData>(
  'ia-gen',
  async (job: Job<IaGenJobData>) => {
    const { userId, prompt, size } = job.data;
    if (job.id) jobStartTimes.set(job.id, Date.now());
    logger.info('[Worker] Processando IA Gen', { jobId: job.id });

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
    } catch (error: unknown) {
      logger.error('[Worker] Erro no IA Gen', error, { jobId: job.id });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_GEN || String(WORKER_CONCURRENCY.IA_GEN_DEFAULT)),
  }
);

export const colorMatchWorker = new Worker<ColorMatchJobData>(
  'color-match',
  async (job: Job<ColorMatchJobData>) => {
    const { userId, image } = job.data;
    if (job.id) jobStartTimes.set(job.id, Date.now());
    logger.info('[Worker] Processando Color Match', { jobId: job.id });

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
    } catch (error: unknown) {
      logger.error('[Worker] Erro no Color Match', error, { jobId: job.id });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: WORKER_CONCURRENCY.COLOR_MATCH,
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
    logger.info(`[${name}] Job completado`, { jobId: job.id });
    const jobId = job.id || 'unknown';
    const startTime = jobStartTimes.get(jobId);
    const duration = startTime ? Date.now() - startTime : undefined;
    if (startTime) jobStartTimes.delete(jobId);
    addJobHistoryEntry({
      jobId,
      queue: worker.name,
      status: 'completed',
      timestamp: Date.now(),
      duration,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error(`[${name}] Job falhou`, err, { jobId: job?.id });
    const jobId = job?.id || 'unknown';
    const startTime = jobStartTimes.get(jobId);
    const duration = startTime ? Date.now() - startTime : undefined;
    if (startTime) jobStartTimes.delete(jobId);
    addJobHistoryEntry({
      jobId,
      queue: worker.name,
      status: 'failed',
      timestamp: Date.now(),
      duration,
      error: err?.message,
    });
  });

  worker.on('error', (err) => {
    if (isShuttingDown) return;
    logger.error(`[${name}] Erro no worker`, err);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`[${name}] Job ficou stalled (possivel crash anterior)`, { jobId });
    addJobHistoryEntry({
      jobId,
      queue: worker.name,
      status: 'stalled',
      timestamp: Date.now(),
    });
  });
}

// ============================================
// GRACEFUL SHUTDOWN (com timeout)
// ============================================

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('[Workers] Sinal recebido, encerrando workers...', { signal });

  const forceExit = setTimeout(() => {
    logger.error('[Workers] Timeout no shutdown. Forcando saida.');
    process.exit(1);
  }, TIMEOUTS.WORKER_SHUTDOWN);

  try {
    await Promise.allSettled(allWorkers.map(w => w.close()));
    logger.info('[Workers] Workers fechados com sucesso');
  } catch (err: unknown) {
    logger.error('[Workers] Erro ao fechar workers', err);
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
  logger.info('[Workers] Iniciando todos os workers...', {
    stencilConcurrency: process.env.WORKER_CONCURRENCY_STENCIL || WORKER_CONCURRENCY.STENCIL_DEFAULT,
    enhanceConcurrency: process.env.WORKER_CONCURRENCY_ENHANCE || WORKER_CONCURRENCY.ENHANCE_DEFAULT,
    iaGenConcurrency: process.env.WORKER_CONCURRENCY_GEN || WORKER_CONCURRENCY.IA_GEN_DEFAULT,
    colorMatchConcurrency: WORKER_CONCURRENCY.COLOR_MATCH,
  });
}
