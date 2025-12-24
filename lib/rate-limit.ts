import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';

/**
 * Rate Limiting com Upstash Redis
 *
 * Protege APIs contra abuso e DDoS
 * Diferentes limites por tipo de operação e plano do usuário
 */

// Configurar Redis do Upstash
// IMPORTANTE: Adicionar variáveis de ambiente no .env:
// UPSTASH_REDIS_REST_URL=https://...
// UPSTASH_REDIS_REST_TOKEN=...

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Se não tiver Upstash configurado, usar mock (desenvolvimento)
const mockRedis = {
  sadd: async () => {},
  eval: async () => [1, []],
  get: async () => null,
  set: async () => {},
};

// ============================================
// RATE LIMITERS POR TIPO DE OPERAÇÃO
// ============================================

/**
 * Rate Limiter para APIs simples (leitura)
 * Limite: 60 requisições por minuto
 */
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * Rate Limiter para geração de stencils (pesado)
 * Limite por plano:
 * - Starter: 5 gerações/minuto
 * - Pro: 10 gerações/minuto
 * - Studio: 20 gerações/minuto
 */
export const createStencilLimiter = (plan: 'free' | 'starter' | 'pro' | 'studio' = 'free') => {
  if (!redis) return null;

  const limits = {
    free: { max: 0, window: '1 m' },     // Free não pode gerar
    starter: { max: 5, window: '1 m' },
    pro: { max: 10, window: '1 m' },
    studio: { max: 20, window: '1 m' },
  };

  // Garantir que sempre tenha um plano válido (fallback para free)
  const validPlan = plan && limits[plan] ? plan : 'free';
  const config = limits[validPlan];

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.max, config.window as any),
    analytics: true,
    prefix: `ratelimit:stencil:${validPlan}`,
  });
};

/**
 * Rate Limiter para webhooks (Stripe, Clerk)
 * Limite: 100 requisições por minuto (mais generoso)
 */
export const webhookLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:webhook',
    })
  : null;

/**
 * Rate Limiter para autenticação (login/signup)
 * Limite: 10 tentativas por 5 minutos
 */
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '5 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Obtém identificador único para rate limiting
 * Prioridade: User ID > IP Address
 */
export async function getRateLimitIdentifier(userId?: string): Promise<string> {
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback para IP
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');

  const ip = forwardedFor?.split(',')[0] || realIp || 'anonymous';
  return `ip:${ip}`;
}

/**
 * Verifica rate limit e retorna resposta formatada
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // Se não tiver Redis configurado (desenvolvimento), permitir tudo
  if (!limiter) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Middleware helper para aplicar rate limiting em API routes
 */
export async function withRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        limit: result.limit,
        remaining: result.remaining,
        reset: new Date(result.reset).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Rate limit OK, executar handler
  const response = await handler();

  // Adicionar headers de rate limit na resposta
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-RateLimit-Limit', result.limit.toString());
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', result.reset.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Bloquear temporariamente um usuário/IP (ban)
 * Útil para detectar comportamento malicioso
 */
export async function blockIdentifier(
  identifier: string,
  durationSeconds: number = 3600
): Promise<void> {
  if (!redis) return;

  await redis.set(`blocked:${identifier}`, '1', {
    ex: durationSeconds,
  });
}

/**
 * Verificar se usuário/IP está bloqueado
 */
export async function isBlocked(identifier: string): Promise<boolean> {
  if (!redis) return false;

  const blocked = await redis.get(`blocked:${identifier}`);
  return blocked === '1';
}

/**
 * Desbloquear usuário/IP
 */
export async function unblockIdentifier(identifier: string): Promise<void> {
  if (!redis) return;

  await redis.del(`blocked:${identifier}`);
}
