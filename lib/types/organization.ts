// =====================================================
// ORGANIZATION TYPES
// Sistema multi-usuários para Studio e Enterprise
// =====================================================

export type OrganizationPlan = 'studio' | 'enterprise';

export type OrganizationRole = 'owner' | 'member';

export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'past_due';

// =====================================================
// MAIN TYPES
// =====================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;

  // Plano (apenas studio ou enterprise)
  plan: OrganizationPlan;

  // Billing
  subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;

  // Limites compartilhados
  credits: number;
  usage_this_month: Record<string, number>;
  daily_usage: Record<string, number>;

  // Owner
  owner_id: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

// =====================================================
// EXTENDED TYPES (com joins)
// =====================================================

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMemberWithUser[];
  member_count: number;
  max_members: number;
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: {
    id: string;
    clerk_id: string;
    name: string | null;
    email: string;
    picture: string | null;
  };
}

export interface OrganizationInviteWithDetails extends OrganizationInvite {
  organization: {
    id: string;
    name: string;
    plan: OrganizationPlan;
  };
  inviter: {
    name: string | null;
    email: string;
  };
}

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateOrganizationRequest {
  name: string;
  plan: OrganizationPlan;
  owner_id: string;
  subscription_id?: string;
}

export interface CreateOrganizationResponse {
  success: boolean;
  organization?: Organization;
  error?: string;
}

export interface InviteMemberRequest {
  organization_id: string;
  email: string;
  invited_by: string;
}

export interface InviteMemberResponse {
  success: boolean;
  invite?: OrganizationInvite;
  error?: string;
}

export interface AcceptInviteRequest {
  token: string;
  user_id: string;
}

export interface AcceptInviteResponse {
  success: boolean;
  organization?: Organization;
  error?: string;
}

export interface RemoveMemberRequest {
  organization_id: string;
  user_id: string;
  removed_by: string;
}

export interface RemoveMemberResponse {
  success: boolean;
  error?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const ORGANIZATION_MEMBER_LIMITS: Record<OrganizationPlan, number> = {
  studio: 3,
  enterprise: 5,
};

export const INVITE_EXPIRATION_HOURS = 72; // 3 dias

export const ORGANIZATION_PLAN_NAMES: Record<OrganizationPlan, string> = {
  studio: 'Studio',
  enterprise: 'Enterprise',
};

export const ORGANIZATION_ROLE_NAMES: Record<OrganizationRole, string> = {
  owner: 'Proprietário',
  member: 'Membro',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getMaxMembers(plan: OrganizationPlan): number {
  return ORGANIZATION_MEMBER_LIMITS[plan];
}

export function canAddMoreMembers(currentCount: number, plan: OrganizationPlan): boolean {
  return currentCount < ORGANIZATION_MEMBER_LIMITS[plan];
}

export function isInviteExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function isSubscriptionActive(
  status: SubscriptionStatus,
  expiresAt: string | null
): boolean {
  if (status !== 'active') return false;
  if (!expiresAt) return true; // sem expiração = sempre ativo
  return new Date(expiresAt) > new Date();
}
