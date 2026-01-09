import { headers } from 'next/headers';

/**
 * Rate Limiting TEMPORARIAMENTE DESABILITADO
 *
 * TODO: Implementar rate limiting com ioredis puro
 * Por enquanto, os limites de uso são controlados via database (ai_usage table)
 * que já garante proteção contra abuso.
 *
 * Motivo da desabilitação: @upstash/ratelimit não é compatível com ioredis do Railway
 */

// 🎛️ CONTROLE: Permitir gerações gratuitas?
// ENV: ALLOW_FREE_GENERATIONS=true para liberar, false/undefined para bloquear
const ALLOW_FREE_GENERATIONS = process.env.ALLOW_FREE_GENERATIONS === 'true';

console.log('[Rate Limit] ⚠️ Rate limiting desabilitado - usando apenas limites de database');

// ============================================
// RATE LIMITERS POR TIPO DE OPERAÇÃO (DESABILITADOS)
// ============================================

/**
 * Rate Limiter para APIs simples (leitura)
 * DESABILITADO - Sempre permite requisições
 */
export const apiLimiter = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 999999,
    remaining: 999999,
    reset: Date.now() + 60000,
  }),
};

/**
 * Rate Limiter para geração de stencils (pesado)
 * DESABILITADO - Retorna sempre null
 * Limites são controlados via database (ai_usage table)
 */
export const createStencilLimiter = (plan: 'free' | 'starter' | 'pro' | 'studio' = 'free') => {
  // Manter lógica de bloqueio FREE se necessário
  if (plan === 'free' && !ALLOW_FREE_GENERATIONS) {
    console.log('[Rate Limit] 🔴 FREE bloqueado (ALLOW_FREE_GENERATIONS=false)');
    return 'BLOCKED_FREE';
  }

  // Rate limiting desabilitado - limites controlados via database
  return null;
};

/**
 * Rate Limiter para webhooks (Stripe, Clerk)
 * DESABILITADO - Retorna sempre null
 */
export const webhookLimiter = null;

/**
 * Rate Limiter para autenticação (login/signup)
 * DESABILITADO - Retorna sempre null
 */
export const authLimiter = null;

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
 * SEMPRE retorna success=true porque rate limiting está desabilitado
 */
export async function checkRateLimit(
  limiter: any,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // Rate limiting desabilitado - sempre permitir
  return {
    success: true,
    limit: 999999,
    remaining: 999999,
    reset: Date.now() + 60000,
  };
}

/**
 * Middleware helper para aplicar rate limiting em API routes
 * Rate limiting desabilitado - apenas mantém lógica de bloqueio FREE
 */
export async function withRateLimit(
  limiter: any,
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

  // Rate limiting desabilitado - sempre executar handler
  return await handler();
}

/**
 * Bloquear temporariamente um usuário/IP (ban)
 * DESABILITADO - Rate limiting desabilitado
 */
export async function blockIdentifier(
  identifier: string,
  durationSeconds: number = 3600
): Promise<void> {
  // Rate limiting desabilitado
  return;
}

/**
 * Verificar se usuário/IP está bloqueado
 * DESABILITADO - Sempre retorna false
 */
export async function isBlocked(identifier: string): Promise<boolean> {
  return false;
}

/**
 * Desbloquear usuário/IP
 * DESABILITADO - Rate limiting desabilitado
 */
export async function unblockIdentifier(identifier: string): Promise<void> {
  // Rate limiting desabilitado
  return;
}
