/**
 * Stripe Plan Mapping
 * Mapeia Price IDs do Stripe para planos internos
 */

import type { PlanType, BillingCycle } from '../stripe/types';

// ============================================================================
// MAPEAMENTO PRICE_ID → PLAN
// ============================================================================

export interface PlanMapping {
  tier: Exclude<PlanType, 'free'>;
  cycle: BillingCycle;
}

/**
 * Obtém plano a partir de um Price ID do Stripe
 */
export function getPlanFromPriceId(priceId: string): PlanMapping | null {
  // Editor Only
  if (priceId === process.env.STRIPE_PRICE_EDITOR_MONTHLY) {
    return { tier: 'editor_only', cycle: 'monthly' };
  }
  if (priceId === process.env.STRIPE_PRICE_EDITOR_QUARTERLY) {
    return { tier: 'editor_only', cycle: 'quarterly' };
  }
  if (priceId === process.env.STRIPE_PRICE_EDITOR_YEARLY) {
    return { tier: 'editor_only', cycle: 'yearly' };
  }

  // Full Access
  if (priceId === process.env.STRIPE_PRICE_FULL_MONTHLY) {
    return { tier: 'full_access', cycle: 'monthly' };
  }
  if (priceId === process.env.STRIPE_PRICE_FULL_QUARTERLY) {
    return { tier: 'full_access', cycle: 'quarterly' };
  }
  if (priceId === process.env.STRIPE_PRICE_FULL_YEARLY) {
    return { tier: 'full_access', cycle: 'yearly' };
  }

  // Legacy (compatibilidade)
  if (priceId === process.env.STRIPE_PRICE_EDITOR) {
    return { tier: 'editor_only', cycle: 'monthly' };
  }
  if (priceId === process.env.STRIPE_PRICE_FULL) {
    return { tier: 'full_access', cycle: 'monthly' };
  }

  console.warn('[PlanMapping] Price ID desconhecido:', priceId);
  return null;
}

/**
 * Obtém Price ID a partir de plano e ciclo
 */
export function getPriceIdFromPlan(
  tier: Exclude<PlanType, 'free'>,
  cycle: BillingCycle
): string {
  const prefix = tier === 'editor_only' ? 'EDITOR' : 'FULL';
  const suffix = cycle.toUpperCase();

  const envKey = `STRIPE_PRICE_${prefix}_${suffix}`;
  const priceId = process.env[envKey];

  if (!priceId) {
    console.error(`[PlanMapping] Variável ${envKey} não configurada`);
    throw new Error(`Price ID não configurado para ${tier} ${cycle}`);
  }

  return priceId;
}

/**
 * Verifica se Price ID é válido
 */
export function isValidPriceId(priceId: string): boolean {
  return getPlanFromPriceId(priceId) !== null;
}

/**
 * Lista todos os Price IDs configurados
 */
export function getAllPriceIds(): string[] {
  return [
    process.env.STRIPE_PRICE_EDITOR_MONTHLY,
    process.env.STRIPE_PRICE_EDITOR_QUARTERLY,
    process.env.STRIPE_PRICE_EDITOR_YEARLY,
    process.env.STRIPE_PRICE_FULL_MONTHLY,
    process.env.STRIPE_PRICE_FULL_QUARTERLY,
    process.env.STRIPE_PRICE_FULL_YEARLY
  ].filter(Boolean) as string[];
}

/**
 * Valida se todas as variáveis de ambiente estão configuradas
 */
export function validatePriceConfig(): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    'STRIPE_PRICE_EDITOR_MONTHLY',
    'STRIPE_PRICE_EDITOR_QUARTERLY',
    'STRIPE_PRICE_EDITOR_YEARLY',
    'STRIPE_PRICE_FULL_MONTHLY',
    'STRIPE_PRICE_FULL_QUARTERLY',
    'STRIPE_PRICE_FULL_YEARLY'
  ];

  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing
  };
}
