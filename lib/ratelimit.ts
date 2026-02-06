import Redis from 'ioredis';

// Reutilizar a string de conexão do ambiente (mesma do Queue Worker)
// Railway fornece REDIS_URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Criar cliente dedicado para Rate Limit (para não bloquear o cliente de filas)
const redis = new Redis(redisUrl, {
  enableReadyCheck: false,
  maxRetriesPerRequest: 1, // Não queremos travar o request por muito tempo
  connectTimeout: 2000,    // Timeout rápido
  tls: redisUrl.startsWith('rediss:') ? { rejectUnauthorized: false } : undefined
});

redis.on('error', (err) => {
  // Silenciar erros de conexão para não derrubar a aplicação
  console.warn('[RateLimit] Redis error:', err.message);
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate Limit Simples (Sliding Window via chave com expiração)
 * 
 * @param identifier Identificador único (ex: 'stencil:user_123')
 * @param limit Máximo de requisições permitidas
 * @param windowSeconds Janela de tempo em segundos
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;

  try {
    // Pipeline atômico: Incrementa e define expiração se for novo
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    
    const results = await pipeline.exec();
    
    // Tratamento de erro do pipeline
    if (!results) {
      // Fail open (se Redis falhar, permite o request)
      return { success: true, limit, remaining: limit, reset: 0 };
    }

    const [incrError, currentCount] = results[0];
    const [ttlError, ttl] = results[1];

    if (incrError) throw incrError;

    const count = currentCount as number;
    
    // Se a chave não tinha TTL (era nova ou perdeu), define
    if ((ttl as number) === -1) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    
    return {
      success: count <= limit,
      limit,
      remaining,
      reset: Date.now() + ((ttl as number) * 1000)
    };

  } catch (error) {
    console.error('[RateLimit] Erro ao verificar limite:', error);
    // Fail safe: Se o Redis cair, liberamos o tráfego para não parar o app
    return { success: true, limit, remaining: 1, reset: 0 };
  }
}

/**
 * API Rate Limiter - Objeto com método limit() para compatibilidade
 */
export const apiLimiter = {
  /**
   * Verifica rate limit para um identificador
   * @param identifier Identificador único (ex: 'user:123' ou 'ip:1.2.3.4')
   * @param limit Limite de requisições (default: 60)
   * @param windowSeconds Janela de tempo em segundos (default: 60)
   */
  limit: async (
    identifier: string,
    limit: number = 60,
    windowSeconds: number = 60
  ): Promise<RateLimitResult> => {
    return rateLimit(identifier, limit, windowSeconds);
  }
};

/**
 * Obtém identificador único para rate limiting
 * Aceita userId diretamente ou extrai do Request
 */
export async function getRateLimitIdentifier(
  userIdOrReq: string | Request | null | undefined,
  userId?: string | null
): Promise<string> {
  // Se recebeu uma string diretamente, usa como userId
  if (typeof userIdOrReq === 'string') {
    return `user:${userIdOrReq}`;
  }

  // Se recebeu userId no segundo parâmetro
  if (userId) {
    return `user:${userId}`;
  }

  // Se recebeu Request, tenta extrair IP
  if (userIdOrReq && typeof userIdOrReq === 'object') {
    const req = userIdOrReq as Request;
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');

    const ip = cfConnectingIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
    return `ip:${ip}`;
  }

  return 'unknown';
}
