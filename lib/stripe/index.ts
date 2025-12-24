/**
 * Stripe Library - Index
 * Exportações centralizadas de todos os serviços Stripe
 */

// Cliente
export { stripe, default as StripeClient } from './client';

// Serviços
export { CustomerService } from './customer-service';
export { SubscriptionService } from './subscription-service';
export { CheckoutService } from './checkout-service';

// Types
export type {
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  PlanType,
  BillingCycle,
  Customer,
  Subscription,
  Payment,
  WebhookLog,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
  SubscriptionStatusResponse,
  StripeWebhookEvent,
  CreateCustomerParams,
  CreateSubscriptionParams,
  UpdateSubscriptionParams
} from './types';
