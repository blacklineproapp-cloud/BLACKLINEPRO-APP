import { Redis } from 'ioredis';

/**
 * Sistema de Cache Híbrido com Redis
 *
 * Usa Redis quando disponível (produção) e fallback para memória (desenvolvimento)
 * Compartilhado entre instâncias + persistente + alta performance
 */

// ============================================
// CONFIGURAÇÃO DO REDIS
// ============================================

let redisClient: Redis | null = null;

// Tentar conectar ao Redis (Upstash ou local)
if (process.env.UPSTASH_REDIS_REST_URL) {
  try {
    redisClient = new Redis({
      host: process.env.UPSTASH_REDIS_REST_URL!.replace('https://', '').replace(
        'http://',
        ''
      ),
      port: 6379,
      password: process.env.UPSTASH_REDIS_REST_TOKEN!,
      tls: process.env.UPSTASH_REDIS_REST_URL?.startsWith('https') ? {} : undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Cache] Redis retry limit reached, using memory fallback');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    // Testar conexão
    redisClient.connect().catch((err) => {
      console.warn('[Cache] Redis connection failed, using memory fallback:', err.message);
      redisClient = null;
    });
  } catch (error) {
    console.warn('[Cache] Redis setup failed, using memory fallback:', error);
    redisClient = null;
  }
} else if (process.env.REDIS_HOST) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });

    redisClient.connect().catch((err) => {
      console.warn('[Cache] Redis connection failed, using memory fallback:', err.message);
      redisClient = null;
    });
  } catch (error) {
    console.warn('[Cache] Redis setup failed, using memory fallback:', error);
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
      console.log(`[Cache] Limpou ${cleaned} entradas expiradas da memória`);
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
  const { ttl = 60000, tags, namespace } = options;

  // Construir chave completa com namespace
  const fullKey = namespace ? `${namespace}:${key}` : key;

  // REDIS: Tentar buscar do Redis
  if (redisClient) {
    try {
      const cached = await redisClient.get(fullKey);

      if (cached) {
        console.log(`✅ [Redis] Cache HIT: ${fullKey}`);
        return JSON.parse(cached) as T;
      }

      // Cache MISS: buscar dados
      console.log(`🔄 [Redis] Cache MISS: ${fullKey}`);
      const data = await fetcher();

      // Salvar no Redis com TTL
      await redisClient.setex(fullKey, Math.floor(ttl / 1000), JSON.stringify(data));

      // Salvar tags (para invalidação por grupo)
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          await redisClient.sadd(`tag:${tag}`, fullKey);
          await redisClient.expire(`tag:${tag}`, Math.floor(ttl / 1000));
        }
      }

      return data;
    } catch (error) {
      console.error(`[Redis] Erro ao acessar cache:`, error);
      // Fallback para memória em caso de erro do Redis
    }
  }

  // MEMÓRIA: Fallback para cache em memória
  const cached = memoryCache.get(fullKey);

  if (cached && cached.expires > Date.now()) {
    console.log(`✅ [Memory] Cache HIT: ${fullKey}`);
    return cached.data as T;
  }

  console.log(`🔄 [Memory] Cache MISS: ${fullKey}`);
  const data = await fetcher();

  memoryCache.set(fullKey, {
    data,
    expires: Date.now() + ttl,
    tags,
  });

  return data;
}

/**
 * Invalida uma entrada específica do cache
 */
export async function invalidateCache(key: string, namespace?: string): Promise<void> {
  const fullKey = namespace ? `${namespace}:${key}` : key;

  if (redisClient) {
    try {
      await redisClient.del(fullKey);
      console.log(`🗑️ [Redis] Cache invalidado: ${fullKey}`);
      return;
    } catch (error) {
      console.error(`[Redis] Erro ao invalidar cache:`, error);
    }
  }

  memoryCache.delete(fullKey);
  console.log(`🗑️ [Memory] Cache invalidado: ${fullKey}`);
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
        console.log(`🗑️ [Redis] ${keys.length} entradas invalidadas: ${fullPattern}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error(`[Redis] Erro ao invalidar por padrão:`, error);
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
  console.log(`🗑️ [Memory] ${count} entradas invalidadas: ${fullPattern}`);
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
        console.log(`🗑️ [Redis] ${keys.length} entradas invalidadas por tag: ${tag}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error(`[Redis] Erro ao invalidar por tag:`, error);
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
  console.log(`🗑️ [Memory] ${count} entradas invalidadas por tag: ${tag}`);
  return count;
}

/**
 * Limpa todo o cache
 */
export async function clearAllCache(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.flushdb();
      console.log(`🗑️ [Redis] Todo cache limpo`);
      return;
    } catch (error) {
      console.error(`[Redis] Erro ao limpar cache:`, error);
    }
  }

  const size = memoryCache.size;
  memoryCache.clear();
  console.log(`🗑️ [Memory] Cache limpo: ${size} entradas`);
}

/**
 * Obtém estatísticas do cache
 */
export async function getCacheStats(): Promise<{
  type: 'redis' | 'memory';
  keys: number;
  memoryUsage?: number;
  hits?: number;
  misses?: number;
}> {
  if (redisClient) {
    try {
      const info = await redisClient.info('stats');
      const dbsize = await redisClient.dbsize();

      // Parse info string
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);

      return {
        type: 'redis',
        keys: dbsize,
        hits: hitsMatch ? parseInt(hitsMatch[1]) : undefined,
        misses: missesMatch ? parseInt(missesMatch[1]) : undefined,
      };
    } catch (error) {
      console.error(`[Redis] Erro ao obter stats:`, error);
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
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000
): Promise<T> {
  return getOrSetCache(key, fetcher, { ttl });
}
