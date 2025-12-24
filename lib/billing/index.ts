/**
 * Billing Library - Index
 * Exportações centralizadas de todas as funcionalidades de billing
 */

// Plans
export {
  BILLING_CYCLES,
  PLAN_PRICING,
  PLANS,
  getStripePriceIds,
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

// Plan Mapping
export {
  getPlanFromPriceId,
  getPriceIdFromPlan,
  isValidPriceId,
  getAllPriceIds,
  validatePriceConfig
} from './stripe-plan-mapping';

export type {
  PlanMapping
} from './stripe-plan-mapping';

// Limits
export {
  PLAN_LIMITS,
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
