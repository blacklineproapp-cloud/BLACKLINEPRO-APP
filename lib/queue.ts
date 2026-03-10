import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { getRedisConnection } from './redis-utils';
import { QUEUE_CONFIG, PAGINATION } from './constants/limits';
import { DURATIONS } from './constants/timeouts';

/**
 * Sistema de Filas com BullMQ + Redis
 *
 * Processa gerações de stencil de forma assíncrona
 * Permite escalar até 5K+ usuários simultâneos
 */

const redisConnection = getRedisConnection();

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

const SC = QUEUE_CONFIG.stencil;
const EC = QUEUE_CONFIG.enhance;
const IC = QUEUE_CONFIG.iaGen;
const CC = QUEUE_CONFIG.colorMatch;

export const stencilQueue = new Queue('stencil-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: SC.attempts,
    backoff: { type: SC.backoffType, delay: SC.backoffDelay },
    removeOnComplete: { count: SC.completedKeep, age: SC.completedAge },
    removeOnFail: { count: SC.failedKeep, age: SC.failedAge },
  },
});

export const enhanceQueue = new Queue('enhance', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: EC.attempts,
    backoff: { type: EC.backoffType, delay: EC.backoffDelay },
    removeOnComplete: { count: EC.completedKeep, age: EC.completedAge },
    removeOnFail: { count: EC.failedKeep, age: EC.failedAge },
  },
});

export const iaGenQueue = new Queue('ia-gen', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: IC.attempts,
    backoff: { type: IC.backoffType, delay: IC.backoffDelay },
    removeOnComplete: { count: IC.completedKeep, age: IC.completedAge },
    removeOnFail: { count: IC.failedKeep, age: IC.failedAge },
  },
});

export const colorMatchQueue = new Queue('color-match', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: CC.attempts,
    backoff: { type: CC.backoffType, delay: CC.backoffDelay },
    removeOnComplete: { count: CC.completedKeep, age: CC.completedAge },
    removeOnFail: { count: CC.failedKeep, age: CC.failedAge },
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

export async function addStencilJob(
  data: StencilJobData,
  priority?: number
): Promise<Job<StencilJobData>> {
  const job = await stencilQueue.add(
    'generate-stencil',
    data,
    {
      priority: priority || SC.priority,
      jobId: `stencil-${data.userId}-${Date.now()}`,
    }
  );

  return job as Job<StencilJobData>;
}

export async function addEnhanceJob(data: EnhanceJobData): Promise<Job<EnhanceJobData>> {
  const job = await enhanceQueue.add('enhance-image', data, {
    jobId: `enhance-${data.userId}-${Date.now()}`,
  });

  return job as Job<EnhanceJobData>;
}

export async function addIaGenJob(data: IaGenJobData): Promise<Job<IaGenJobData>> {
  const job = await iaGenQueue.add('generate-idea', data, {
    jobId: `ia-gen-${data.userId}-${Date.now()}`,
  });

  return job as Job<IaGenJobData>;
}

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

  const [waiting, active, completed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(0, PAGINATION.RECENT_JOBS),
  ]);

  const allJobs = [...waiting, ...active, ...completed];
  return allJobs.filter((job) => (job.data as any).userId === userId);
}

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

export async function cleanOldJobs(): Promise<void> {
  await Promise.all([
    stencilQueue.clean(DURATIONS.DAY, SC.completedKeep, 'completed'),
    stencilQueue.clean(DURATIONS.WEEK, SC.failedKeep, 'failed'),
    enhanceQueue.clean(DURATIONS.DAY, EC.completedKeep, 'completed'),
    iaGenQueue.clean(DURATIONS.DAY, IC.completedKeep, 'completed'),
  ]);
}

// ============================================
// EXPORTAÇÕES
// ============================================

export { Queue, Worker, Job, QueueEvents };
