/**
 * Stripe Plan Mapping
 * Mapeia Price IDs do Stripe para planos internos
 * 
 * ATUALIZADO: Dezembro 2025
 * - Novos nomes: starter, pro, studio
 * - Removido: editor_only, full_access
 */

import type { BillingCycle } from '../stripe/types';

// ============================================================================
// TIPOS
// ============================================================================

export type PlanTier = 'starter' | 'pro' | 'studio';

export interface PlanMapping {
  tier: PlanTier;
  cycle: BillingCycle;
}

// ============================================================================
// MAPEAMENTO PRICE_ID → PLAN
// ============================================================================

/**
 * Obtém plano a partir de um Price ID do Stripe
 */
export function getPlanFromPriceId(priceId: string): PlanMapping | null {
  // Starter (R$ 50/mês)
  if (priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY) {
    return { tier: 'starter', cycle: 'monthly' };
  }
  if (priceId === process.env.STRIPE_PRICE_STARTER_QUARTERLY) {
    return { tier: 'starter', cycle: 'quarterly' };
  }
  if (priceId === process.env.STRIPE_PRICE_STARTER_SEMIANNUAL) {
    return { tier: 'starter', cycle: 'semiannual' };
  }
  if (priceId === process.env.STRIPE_PRICE_STARTER_YEARLY) {
    return { tier: 'starter', cycle: 'yearly' };
  }

  // Pro (R$ 100/mês)
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
    return { tier: 'pro', cycle: 'monthly' };
  }
  if (priceId === process.env.STRIPE_PRICE_PRO_QUARTERLY) {
    return { tier: 'pro', cycle: 'quarterly' };
  }
  if (priceId === process.env.STRIPE_PRICE_PRO_SEMIANNUAL) {
    return { tier: 'pro', cycle: 'semiannual' };
  }
  if (priceId === process.env.STRIPE_PRICE_PRO_YEARLY) {
    return { tier: 'pro', cycle: 'yearly' };
  }

  // Studio (R$ 300/mês)
  if (priceId === process.env.STRIPE_PRICE_STUDIO_MONTHLY) {
    return { tier: 'studio', cycle: 'monthly' };
  }
  if (priceId === process.env.STRIPE_PRICE_STUDIO_QUARTERLY) {
    return { tier: 'studio', cycle: 'quarterly' };
  }
  if (priceId === process.env.STRIPE_PRICE_STUDIO_SEMIANNUAL) {
    return { tier: 'studio', cycle: 'semiannual' };
  }
  if (priceId === process.env.STRIPE_PRICE_STUDIO_YEARLY) {
    return { tier: 'studio', cycle: 'yearly' };
  }

  console.warn('[PlanMapping] Price ID desconhecido:', priceId);
  return null;
}

/**
 * Obtém Price ID a partir de plano e ciclo
 */
export function getPriceIdFromPlan(
  tier: PlanTier,
  cycle: BillingCycle
): string {
  const prefix = tier.toUpperCase(); // STARTER, PRO, STUDIO
  const suffix = cycle.toUpperCase(); // MONTHLY, QUARTERLY, YEARLY

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
    // Starter
    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    process.env.STRIPE_PRICE_STARTER_QUARTERLY,
    process.env.STRIPE_PRICE_STARTER_SEMIANNUAL,
    process.env.STRIPE_PRICE_STARTER_YEARLY,
    // Pro
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_QUARTERLY,
    process.env.STRIPE_PRICE_PRO_SEMIANNUAL,
    process.env.STRIPE_PRICE_PRO_YEARLY,
    // Studio
    process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    process.env.STRIPE_PRICE_STUDIO_QUARTERLY,
    process.env.STRIPE_PRICE_STUDIO_SEMIANNUAL,
    process.env.STRIPE_PRICE_STUDIO_YEARLY,
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
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_STUDIO_MONTHLY',
  ];

  // Quarterly e Yearly são opcionais por enquanto
  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing
  };
}
