/**
 * Billing Library - Index
 * Exportações centralizadas de todas as funcionalidades de billing
 */

// Plans
export {
  BILLING_CYCLES,
  PLAN_PRICING,
  PLANS,
  formatPrice,
  getMonthlyEquivalent,
  hasFeature
} from './plans';

export type {
  CycleInfo,
  PlanPricing,
  PlanFeature,
  PlanInfo
} from './plans';

// Types
export type {
  BillingCycle,
  PlanType,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  PlanFeatures as BillingPlanFeatures,
} from './types';

export { PLAN_FEATURES } from './types';

// Limits & Access
export {
  PLAN_LIMITS,
  checkAccess,
  checkEditorLimit,
  checkAILimit,
  checkToolsLimit,
  recordUsage,
  getMonthlyUsage,
  getAllLimits,
  getLimitMessage
} from './limits';

export type {
  UsageLimits,
  UsageType,
  LimitCheckResult,
  RecordUsageParams
} from './limits';

// Service (unified billing access checks)
export {
  checkToolAccess,
  checkPaidAccess
} from './service';

export type {
  ToolAccessParams,
  ToolAccessResult
} from './service';
