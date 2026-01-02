import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';

/**
 * Rate Limiting com Upstash Redis
 *
 * Protege APIs contra abuso e DDoS
 * Diferentes limites por tipo de operação e plano do usuário
 */

// 🎛️ CONTROLE: Permitir gerações gratuitas?
// ENV: ALLOW_FREE_GENERATIONS=true para liberar, false/undefined para bloquear
const ALLOW_FREE_GENERATIONS = process.env.ALLOW_FREE_GENERATIONS === 'true';

// Configurar Redis do Upstash
// IMPORTANTE: Adicionar variáveis de ambiente no .env:
// UPSTASH_REDIS_REST_URL=https://...
// UPSTASH_REDIS_REST_TOKEN=...

// 🚀 OTIMIZAÇÃO: Desabilitar rate limiting em desenvolvimento
// Economiza ~100k requests/mês do limite Upstash (500k/mês free)
// Em dev, rate limiting não é necessário (você é o único usuário)
const redis =
  process.env.NODE_ENV === 'production' &&
  process.env.UPSTASH_REDIS_REST_URL
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
 * - Free: BLOQUEADO (ou 3/min se ALLOW_FREE_GENERATIONS=true)
 * - Starter: 5 gerações/minuto
 * - Pro: 10 gerações/minuto
 * - Studio: 20 gerações/minuto
 */
export const createStencilLimiter = (plan: 'free' | 'starter' | 'pro' | 'studio' = 'free') => {
  // Garantir que sempre tenha um plano válido (fallback para free)
  const validPlans = ['free', 'starter', 'pro', 'studio'];
  const validPlan = plan && validPlans.includes(plan) ? plan : 'free';

  // 🔒 FREE: Depende da variável de ambiente
  if (validPlan === 'free') {
    if (ALLOW_FREE_GENERATIONS) {
      // Modo liberado: FREE pode gerar com limite de 3/min
      console.log('[Rate Limit] 🟢 FREE liberado (ALLOW_FREE_GENERATIONS=true)');
      if (!redis) return null;
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 gerações/minuto para free
        analytics: true,
        prefix: 'ratelimit:stencil:free',
      });
    } else {
      // Modo bloqueado: FREE não pode gerar
      console.log('[Rate Limit] 🔴 FREE bloqueado (ALLOW_FREE_GENERATIONS=false)');
      return 'BLOCKED_FREE';
    }
  }

  if (!redis) return null;

  const limits = {
    starter: { max: 5, window: '1 m' },
    pro: { max: 10, window: '1 m' },
    studio: { max: 20, window: '1 m' },
  };

  const config = limits[validPlan as keyof typeof limits];
  if (!config) return null;

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
  limiter: Ratelimit | null | 'BLOCKED_FREE',
  identifier: string,
  handler: () => Promise<Response>
): Promise<Response> {
  // 🔒 BLOQUEIO IMEDIATO para plano FREE
  if (limiter === 'BLOCKED_FREE') {
    return new Response(
      JSON.stringify({
        error: 'Plano gratuito não permite gerações',
        message: 'Você está no plano gratuito. Assine um plano para gerar estêncils.',
        requiresSubscription: true,
        subscriptionType: 'plan',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

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
