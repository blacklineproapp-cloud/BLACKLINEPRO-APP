import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Sistema de Filas com BullMQ + Redis
 *
 * Processa gerações de stencil de forma assíncrona
 * Permite escalar até 5K+ usuários simultâneos
 */

// ============================================
// CONFIGURAÇÃO DO REDIS
// ============================================

// Usar mesmo Redis do Upstash (rate limiting) ou criar separado
const redisConnection = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      host: process.env.UPSTASH_REDIS_REST_URL!.replace('https://', '').replace(
        'http://',
        ''
      ),
      port: 6379,
      password: process.env.UPSTASH_REDIS_REST_TOKEN!,
      tls: process.env.UPSTASH_REDIS_REST_URL?.startsWith('https') ? {} : undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

// ============================================
// TIPOS DE JOBS
// ============================================

export interface StencilJobData {
  userId: string;
  userEmail?: string;
  image: string; // Base64
  style: 'standard' | 'perfect_lines';
  promptDetails?: string;
  operationType: 'topographic' | 'lines';
}

export interface EnhanceJobData {
  userId: string;
  image: string;
}

export interface IaGenJobData {
  userId: string;
  prompt: string;
  size: '1K' | '2K' | '4K';
}

export interface ColorMatchJobData {
  userId: string;
  image: string;
}

export type JobData = StencilJobData | EnhanceJobData | IaGenJobData | ColorMatchJobData;

// ============================================
// FILAS
// ============================================

/**
 * Fila de geração de stencils (topográfico, linhas)
 * Prioridade: ALTA (operação principal do app)
 */
export const stencilQueue = new Queue('stencil-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry até 3 vezes
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: {
      count: 100, // Manter últimos 100 jobs completados
      age: 24 * 3600, // Remover após 24h
    },
    removeOnFail: {
      count: 50, // Manter últimos 50 jobs falhados
      age: 7 * 24 * 3600, // Remover após 7 dias
    },
  },
});

/**
 * Fila de enhance (upscale 4K)
 * Prioridade: MÉDIA
 */
export const enhanceQueue = new Queue('enhance', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: { count: 50, age: 24 * 3600 },
    removeOnFail: { count: 25, age: 7 * 24 * 3600 },
  },
});

/**
 * Fila de IA Gen (geração de ideias)
 * Prioridade: MÉDIA
 */
export const iaGenQueue = new Queue('ia-gen', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: { count: 50, age: 24 * 3600 },
    removeOnFail: { count: 25, age: 7 * 24 * 3600 },
  },
});

/**
 * Fila de color match (análise de cores)
 * Prioridade: BAIXA (rápido, não precisa de muita fila)
 */
export const colorMatchQueue = new Queue('color-match', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: { count: 25, age: 12 * 3600 },
    removeOnFail: { count: 10, age: 3 * 24 * 3600 },
  },
});

// ============================================
// EVENTOS DAS FILAS (para WebSockets/logs)
// ============================================

export const stencilQueueEvents = new QueueEvents('stencil-generation', {
  connection: redisConnection,
});

export const enhanceQueueEvents = new QueueEvents('enhance', {
  connection: redisConnection,
});

export const iaGenQueueEvents = new QueueEvents('ia-gen', {
  connection: redisConnection,
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Adiciona job de geração de stencil à fila
 */
export async function addStencilJob(
  data: StencilJobData,
  priority?: number
): Promise<Job<StencilJobData>> {
  const job = await stencilQueue.add(
    'generate-stencil',
    data,
    {
      priority: priority || 10, // Menor número = maior prioridade
      jobId: `stencil-${data.userId}-${Date.now()}`,
    }
  );

  console.log(`[Queue] Job criado: ${job.id} (user: ${data.userId})`);
  return job as Job<StencilJobData>;
}

/**
 * Adiciona job de enhance à fila
 */
export async function addEnhanceJob(data: EnhanceJobData): Promise<Job<EnhanceJobData>> {
  const job = await enhanceQueue.add('enhance-image', data, {
    jobId: `enhance-${data.userId}-${Date.now()}`,
  });

  console.log(`[Queue] Enhance job criado: ${job.id}`);
  return job as Job<EnhanceJobData>;
}

/**
 * Adiciona job de IA Gen à fila
 */
export async function addIaGenJob(data: IaGenJobData): Promise<Job<IaGenJobData>> {
  const job = await iaGenQueue.add('generate-idea', data, {
    jobId: `ia-gen-${data.userId}-${Date.now()}`,
  });

  console.log(`[Queue] IA Gen job criado: ${job.id}`);
  return job as Job<IaGenJobData>;
}

/**
 * Obtém status de um job
 */
export async function getJobStatus(
  queueName: 'stencil-generation' | 'enhance' | 'ia-gen' | 'color-match',
  jobId: string
): Promise<{
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress?: number;
  result?: any;
  error?: string;
}> {
  let queue: Queue;

  switch (queueName) {
    case 'stencil-generation':
      queue = stencilQueue;
      break;
    case 'enhance':
      queue = enhanceQueue;
      break;
    case 'ia-gen':
      queue = iaGenQueue;
      break;
    case 'color-match':
      queue = colorMatchQueue;
      break;
  }

  const job = await queue.getJob(jobId);

  if (!job) {
    return { status: 'unknown' };
  }

  const state = await job.getState();
  const progress = job.progress as number;

  if (state === 'completed') {
    return {
      status: 'completed',
      result: job.returnvalue,
    };
  }

  if (state === 'failed') {
    return {
      status: 'failed',
      error: job.failedReason,
    };
  }

  return {
    status: state as any,
    progress,
  };
}

/**
 * Obtém jobs de um usuário específico
 */
export async function getUserJobs(
  userId: string,
  queueName: 'stencil-generation' | 'enhance' | 'ia-gen'
): Promise<Job[]> {
  let queue: Queue;

  switch (queueName) {
    case 'stencil-generation':
      queue = stencilQueue;
      break;
    case 'enhance':
      queue = enhanceQueue;
      break;
    case 'ia-gen':
      queue = iaGenQueue;
      break;
  }

  // Buscar jobs ativos, aguardando e completados recentes
  const [waiting, active, completed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(0, 10), // Últimos 10 completados
  ]);

  const allJobs = [...waiting, ...active, ...completed];

  // Filtrar por userId
  return allJobs.filter((job) => (job.data as any).userId === userId);
}

/**
 * Estatísticas da fila
 */
export async function getQueueStats(
  queueName: 'stencil-generation' | 'enhance' | 'ia-gen'
): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  let queue: Queue;

  switch (queueName) {
    case 'stencil-generation':
      queue = stencilQueue;
      break;
    case 'enhance':
      queue = enhanceQueue;
      break;
    case 'ia-gen':
      queue = iaGenQueue;
      break;
  }

  const counts = await queue.getJobCounts();

  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
  };
}

/**
 * Limpa jobs antigos (executar via cron)
 */
export async function cleanOldJobs(): Promise<void> {
  await Promise.all([
    stencilQueue.clean(24 * 3600 * 1000, 100, 'completed'), // 24h
    stencilQueue.clean(7 * 24 * 3600 * 1000, 50, 'failed'), // 7 dias
    enhanceQueue.clean(24 * 3600 * 1000, 50, 'completed'),
    iaGenQueue.clean(24 * 3600 * 1000, 50, 'completed'),
  ]);

  console.log('[Queue] Jobs antigos limpos');
}

// ============================================
// EXPORTAÇÕES
// ============================================

export { Queue, Worker, Job, QueueEvents };
