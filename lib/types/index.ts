/**
 * Central Type Registry
 *
 * Re-exports all type definitions from across the codebase for convenient imports:
 *   import { PlanType, AdjustControls, Organization, Stroke } from '@/lib/types';
 *
 * Existing imports (e.g. from '@/lib/billing/types') continue to work unchanged.
 *
 * NAMING CONFLICT NOTE:
 * - `SubscriptionStatus` exists in both billing/types and organization types
 *   with different value sets. They are re-exported here with distinct names:
 *     - `SubscriptionStatus`     -> from billing/types (the more widely used one)
 *     - `OrgSubscriptionStatus`  -> from organization types (aliased to avoid collision)
 */

// Billing types (BillingCycle, PlanType, SubscriptionStatus, PaymentStatus, etc.)
export * from '../billing/types';

// Stencil types (AdjustControls, StencilPreset, StencilQuality, etc.)
export * from '../stencil-types';

// Organization types - selective re-export to avoid SubscriptionStatus collision
// The organization module defines its own SubscriptionStatus with different values,
// so we re-export it under an alias.
export {
  type OrganizationPlan,
  type OrganizationRole,
  type SubscriptionStatus as OrgSubscriptionStatus,
  type Organization,
  type OrganizationMember,
  type OrganizationInvite,
  type OrganizationWithMembers,
  type OrganizationMemberWithUser,
  type OrganizationInviteWithDetails,
  type CreateOrganizationRequest,
  type CreateOrganizationResponse,
  type InviteMemberRequest,
  type InviteMemberResponse,
  type AcceptInviteRequest,
  type AcceptInviteResponse,
  type RemoveMemberRequest,
  type RemoveMemberResponse,
  ORGANIZATION_MEMBER_LIMITS,
  INVITE_EXPIRATION_HOURS,
  ORGANIZATION_PLAN_NAMES,
  ORGANIZATION_ROLE_NAMES,
  getMaxMembers,
  canAddMoreMembers,
  isInviteExpired,
  isSubscriptionActive,
} from './organization';

// Drawing types (Point, Stroke, DrawingTool, BrushPreset, etc.)
export * from '../drawing/types';

// Asaas types (AsaasCustomer, AsaasPayment, AsaasSubscription, etc.)
export * from '../asaas/types';
