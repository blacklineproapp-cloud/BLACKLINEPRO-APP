import type { ConnectionOptions } from 'bullmq';
import { logger } from './logger';

/**
 * Parse Redis URL para ConnectionOptions do BullMQ/ioredis
 *
 * BullMQ precisa de Redis TCP (não REST API como Upstash).
 * Railway fornece REDIS_URL completa: redis://user:pass@host:port
 */

const MAX_REDIS_RETRIES = 20;

export function parseRedisUrl(url: string): ConnectionOptions {
  const urlObj = new URL(url);
  const isTls = urlObj.protocol === 'rediss:';

  return {
    host: urlObj.hostname,
    port: parseInt(urlObj.port) || 6379,
    password: urlObj.password || undefined,
    username: urlObj.username || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    keepAlive: 30000,
    connectTimeout: 15000,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    retryStrategy: (times: number) => {
      if (times > MAX_REDIS_RETRIES) {
        logger.error('[Redis] Máximo de tentativas atingido, parando reconexão', undefined, { attempts: times });
        return null;
      }
      const delay = Math.min(times * 100, 5000);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
      return targetErrors.some(e => err.message.includes(e));
    },
  };
}

export function getRedisConnection(): ConnectionOptions {
  return process.env.REDIS_URL
    ? parseRedisUrl(process.env.REDIS_URL)
    : {
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
      };
}
