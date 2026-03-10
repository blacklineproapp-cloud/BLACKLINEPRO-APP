import { Redis } from 'ioredis';
import { logger } from './logger';

/**
 * Sistema de Cache Híbrido com Redis
 *
 * Usa Redis quando disponível (produção) e fallback para memória (desenvolvimento)
 * Compartilhado entre instâncias + persistente + alta performance
 *
 * 🚀 MIGRAÇÃO: Upstash → Railway Redis
 * - Railway Redis usa protocolo TCP nativo (ioredis)
 * - Upstash cobrava US$ 12/mês desnecessariamente
 * - Railway Redis é GRÁTIS e mais rápido (mesmo datacenter)
 */

// ============================================
// CONFIGURAÇÃO DO REDIS (singleton via globalThis para sobreviver HMR)
// ============================================

const globalForRedis = globalThis as unknown as { __redisClient?: Redis | null };

let redisClient: Redis | null = globalForRedis.__redisClient ?? null;

if (!redisClient && process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      commandTimeout: 10000,
      connectTimeout: 10000,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.connect().then(() => {
      logger.info('[Cache] Railway Redis conectado');
    }).catch((error) => {
      logger.warn('[Cache] Railway Redis falhou, usando memory fallback', { error: error.message });
      redisClient = null;
      globalForRedis.__redisClient = null;
    });

    redisClient.on('error', (err) => {
      logger.error('[Cache] Erro Railway Redis', err);
    });

    redisClient.on('reconnecting', () => {
      logger.info('[Cache] Reconectando ao Railway Redis...');
    });

    globalForRedis.__redisClient = redisClient;
  } catch (error) {
    logger.warn('[Cache] Redis setup failed, using memory fallback', { error });
    redisClient = null;
  }
}

// ============================================
// FALLBACK: CACHE EM MEMÓRIA
// ============================================

interface CacheEntry<T> {
  data: T;
  expires: number;
  tags?: string[];
}

const memoryCache = new Map<string, CacheEntry<any>>();

// ============================================
// CACHE METRICS (in-memory counters)
// ============================================

const cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
};

// Limpar cache expirado periodicamente (apenas em memória)
if (!redisClient) {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expires < now) {
        memoryCache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug('[Cache] Limpou entradas expiradas da memória', { cleaned });
    }
  }, 60000); // A cada 1 minuto
}

// ============================================
// INTERFACE UNIFICADA
// ============================================

export interface CacheOptions {
  /**
   * TTL em milissegundos (padrão: 60000 = 1min)
   */
  ttl?: number;

  /**
   * Tags para agrupar e invalidar cache relacionado
   * Exemplo: ['user:123', 'stencils']
   */
  tags?: string[];

  /**
   * Namespace para organizar chaves
   * Exemplo: 'users', 'stencils', 'admin'
   */
  namespace?: string;
}

/**
 * Busca dados do cache ou executa fetcher se expirado/não existir
 *
 * @param key - Chave única do cache
 * @param fetcher - Função assíncrona que busca os dados
 * @param options - Opções de cache (TTL, tags, namespace)
 * @returns Dados do cache ou recém-buscados
 *
 * @example
 * ```typescript
 * const user = await getOrSetCache(
 *   'user-profile',
 *   async () => fetchUserFromDB(userId),
 *   {
 *     ttl: 120000, // 2 minutos
 *     tags: ['user:123'],
 *     namespace: 'users'
 *   }
 * );
 * ```
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // 🚀 OTIMIZAÇÃO: TTL padrão aumentado de 1min para 5min
  const { ttl = 300000, tags, namespace } = options;

  // Construir chave completa com namespace
  const fullKey = namespace ? `${namespace}:${key}` : key;

  // 1. Tentar buscar do Redis (sem rodar fetcher ainda)
  if (redisClient) {
    try {
      const cached = await redisClient.get(fullKey);

      if (cached) {
        logger.debug('[Cache] Redis HIT', { key: fullKey });
        cacheMetrics.hits++;
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      logger.error('[Cache] Erro ao acessar cache (GET)', error, { key: fullKey });
      cacheMetrics.errors++;
      // Apenas logar erro do Redis e continuar para fallback/fetcher
      // NÃO chamar fetcher aqui dentro
    }
  }

  // 2. Tentar buscar da Memória (se Redis falhou ou deu miss)
  const memoryCached = memoryCache.get(fullKey);
  if (memoryCached && memoryCached.expires > Date.now()) {
    logger.debug('[Cache] Memory HIT', { key: fullKey });
    cacheMetrics.hits++;
    return memoryCached.data as T;
  }

  // 3. Cache Miss (ambos): Executar fetcher
  // Se o fetcher falhar, o erro sobe (não é engolido) e não tentamos 2x
  logger.debug('[Cache] MISS (Redis+Mem)', { key: fullKey });
  cacheMetrics.misses++;
  const data = await fetcher();

  // 4. Salvar no Cache (Background - não bloquear resposta)
  // Usar Promise.allSettled ou fire-and-forget para não atrasar o return
  (async () => {
    // Salvar memória
    memoryCache.set(fullKey, {
      data,
      expires: Date.now() + ttl,
      tags,
    });

    // Salvar Redis
    if (redisClient) {
      try {
        await redisClient.setex(fullKey, Math.floor(ttl / 1000), JSON.stringify(data));
      } catch (error) {
        logger.error('[Cache] Erro ao definir cache (SET)', error, { key: fullKey });
      }
    }
  })();

  return data;
}

/**
 * Define um valor no cache explicitamente
 */
export async function setCache<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 300000, namespace } = options;
  const fullKey = namespace ? `${namespace}:${key}` : key;

  if (redisClient) {
    try {
      await redisClient.setex(fullKey, Math.floor(ttl / 1000), JSON.stringify(data));
      logger.debug('[Cache] Redis SET', { key: fullKey });
      return;
    } catch (error) {
      logger.error('[Cache] Erro ao definir cache', error, { key: fullKey });
    }
  }

  // Memory fallback
  memoryCache.set(fullKey, {
    data,
    expires: Date.now() + ttl,
    tags: options.tags,
  });
  logger.debug('[Cache] Memory SET', { key: fullKey });
}


/**
 * Invalida uma entrada específica do cache
 */
export async function invalidateCache(key: string, namespace?: string): Promise<void> {
  const fullKey = namespace ? `${namespace}:${key}` : key;

  if (redisClient) {
    try {
      await redisClient.del(fullKey);
      logger.debug('[Cache] Redis invalidado', { key: fullKey });
      return;
    } catch (error) {
      logger.error('[Cache] Erro ao invalidar cache', error, { key: fullKey });
    }
  }

  memoryCache.delete(fullKey);
  logger.debug('[Cache] Memory invalidado', { key: fullKey });
}

/**
 * Invalida múltiplas chaves por padrão (glob)
 */
export async function invalidateCacheByPattern(
  pattern: string,
  namespace?: string
): Promise<number> {
  const fullPattern = namespace ? `${namespace}:${pattern}` : pattern;

  if (redisClient) {
    try {
      const keys = await redisClient.keys(fullPattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info('[Cache] Redis entradas invalidadas por padrão', { count: keys.length, pattern: fullPattern });
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error('[Cache] Erro ao invalidar por padrão', error, { pattern: fullPattern });
    }
  }

  // Memory fallback
  let count = 0;
  const regex = new RegExp(fullPattern.replace('*', '.*'));
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      count++;
    }
  }
  logger.info('[Cache] Memory entradas invalidadas por padrão', { count, pattern: fullPattern });
  return count;
}

/**
 * Invalida cache por tag
 */
export async function invalidateCacheByTag(tag: string): Promise<number> {
  if (redisClient) {
    try {
      const keys = await redisClient.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        await redisClient.del(`tag:${tag}`);
        logger.info('[Cache] Redis entradas invalidadas por tag', { count: keys.length, tag });
        return keys.length;
      }
      return 0;
    } catch (error) {
      logger.error('[Cache] Erro ao invalidar por tag', error, { tag });
    }
  }

  // Memory fallback
  let count = 0;
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.tags?.includes(tag)) {
      memoryCache.delete(key);
      count++;
    }
  }
  logger.info('[Cache] Memory entradas invalidadas por tag', { count, tag });
  return count;
}

/**
 * Limpa todo o cache
 */
export async function clearAllCache(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.flushdb();
      logger.info('[Cache] Todo cache Redis limpo');
      return;
    } catch (error) {
      logger.error('[Cache] Erro ao limpar cache', error);
    }
  }

  const size = memoryCache.size;
  memoryCache.clear();
  logger.info('[Cache] Memory cache limpo', { entries: size });
}

/**
 * Obtém estatísticas do cache
 */
export async function getCacheStats(): Promise<{
  type: 'redis' | 'memory';
  keys: number;
  memoryUsage?: number;
  hits: number;
  misses: number;
  errors: number;
}> {
  if (redisClient) {
    try {
      const dbsize = await redisClient.dbsize();

      return {
        type: 'redis',
        keys: dbsize,
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        errors: cacheMetrics.errors,
      };
    } catch (error) {
      logger.error('[Cache] Erro ao obter stats', error);
    }
  }

  const now = Date.now();
  let valid = 0;
  let expired = 0;

  for (const entry of memoryCache.values()) {
    if (entry.expires > now) {
      valid++;
    } else {
      expired++;
    }
  }

  return {
    type: 'memory',
    keys: memoryCache.size,
    memoryUsage: valid,
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    errors: cacheMetrics.errors,
  };
}

/**
 * Verifica se Redis está conectado
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Wrapper: getCached (compatibilidade com código antigo)
 * 🚀 OTIMIZAÇÃO: TTL padrão 5min (era 1min)
 */
/**
 * Returns current cache hit/miss/error counters
 */
export function getCacheMetrics() {
  return { ...cacheMetrics };
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300000 // 5 minutos
): Promise<T> {
  return getOrSetCache(key, fetcher, { ttl });
}
