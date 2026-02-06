/**
 * Tipos para o sistema de billing (Asaas)
 */

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'yearly';

export type PlanType = 'free' | 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'blocked';

export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'chargeback';

export type PaymentMethod =
  | 'credit_card'
  | 'boleto'
  | 'pix'
  | 'undefined';

export interface PlanFeatures {
  name: string;
  generations: number;
  hasTools: boolean;
  hasAdvancedEditor: boolean;
  hasPrioritySupport: boolean;
  hasAPI: boolean;
}

export interface PlanPricing {
  monthly: number;
  quarterly: number;
  semiannual: number;
  yearly: number;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  free: {
    name: 'Free',
    generations: 3,
    hasTools: false,
    hasAdvancedEditor: false,
    hasPrioritySupport: false,
    hasAPI: false,
  },
  starter: {
    name: 'Starter',
    generations: 100,
    hasTools: false,
    hasAdvancedEditor: true,
    hasPrioritySupport: false,
    hasAPI: false,
  },
  pro: {
    name: 'Pro',
    generations: 500,
    hasTools: true,
    hasAdvancedEditor: true,
    hasPrioritySupport: true,
    hasAPI: false,
  },
  studio: {
    name: 'Studio',
    generations: 2000,
    hasTools: true,
    hasAdvancedEditor: true,
    hasPrioritySupport: true,
    hasAPI: true,
  },
  enterprise: {
    name: 'Enterprise',
    generations: -1, // Ilimitado
    hasTools: true,
    hasAdvancedEditor: true,
    hasPrioritySupport: true,
    hasAPI: true,
  },
  legacy: {
    name: 'Legacy',
    generations: 50,
    hasTools: false,
    hasAdvancedEditor: true,
    hasPrioritySupport: false,
    hasAPI: false,
  },
};
