/**
 * Tipos para o sistema de billing (Asaas)
 */

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'yearly';

export type PlanType = 'free' | 'ink' | 'pro' | 'studio';

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
    name: 'Blackline Free',
    generations: -1,  // BYOK: ilimitado
    hasTools: false,
    hasAdvancedEditor: false,
    hasPrioritySupport: false,
    hasAPI: false,
  },
  ink: {
    name: 'Blackline Ink',
    generations: -1,
    hasTools: false,
    hasAdvancedEditor: true,
    hasPrioritySupport: false,
    hasAPI: false,
  },
  pro: {
    name: 'Blackline Pro',
    generations: -1,
    hasTools: true,
    hasAdvancedEditor: true,
    hasPrioritySupport: true,
    hasAPI: false,
  },
  studio: {
    name: 'Blackline Studio',
    generations: -1,
    hasTools: true,
    hasAdvancedEditor: true,
    hasPrioritySupport: true,
    hasAPI: true,
  },
};
