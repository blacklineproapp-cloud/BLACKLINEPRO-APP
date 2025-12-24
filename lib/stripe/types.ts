/**
 * TypeScript Definitions para Stripe
 * Tipos completos para objetos e respostas do Stripe
 */

import Stripe from 'stripe';

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

// ============================================================================
// PAYMENT STATUS
// ============================================================================

export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'overdue';

// ============================================================================
// PAYMENT METHOD
// ============================================================================

export type PaymentMethod =
  | 'card'
  | 'boleto'
  | 'pix'
  | 'apple_pay'
  | 'google_pay'
  | 'cash_app_pay'
  | 'ach_debit'
  | 'other';

// ============================================================================
// PLAN TYPE
// ============================================================================

export type PlanType = 'free' | 'editor_only' | 'full_access';

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

// ============================================================================
// DATABASE MODELS
// ============================================================================

export interface Customer {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  nome: string | null;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string | null;
  customer_id: string | null;
  subscription_id: string | null;
  stripe_payment_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  description: string | null;
  plan_type: string | null;
  receipt_url: string | null;
  invoice_url: string | null;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  event: string;
  stripe_event_id: string;
  payload: Record<string, any>;
  processed: boolean;
  error: string | null;
  processed_at: string | null;
  created_at: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface CreateCheckoutSessionResponse {
  url: string | null;
  sessionId: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

export interface SubscriptionStatusResponse {
  isSubscribed: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  plan: PlanType;
  toolsUnlocked: boolean;
}

// ============================================================================
// STRIPE WEBHOOK EVENTS
// ============================================================================

export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

// ============================================================================
// HELPERS
// ============================================================================

export interface CreateCustomerParams {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Stripe
};
