// =====================================================
// ORGANIZATIONS LIBRARY
// CRUD de organizações para planos Studio e Enterprise
// =====================================================

import { supabaseAdmin } from '@/lib/supabase';
import type {
  Organization,
  OrganizationPlan,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
} from '@/lib/types/organization';

// =====================================================
// HELPER: Gerar slug único
// =====================================================
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui não-alfanuméricos por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens no início/fim
    .substring(0, 50); // Limita tamanho
}

// =====================================================
// CREATE ORGANIZATION
// Chamado automaticamente pelo webhook do Stripe
// =====================================================
export async function createOrganization(
  params: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> {
  try {
    const slug = generateSlug(params.name);

    // 1. Criar organização
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: params.name,
        slug,
        plan: params.plan,
        owner_id: params.owner_id,
        subscription_id: params.subscription_id || null,
        subscription_status: 'active',
      })
      .select()
      .single();

    if (orgError) {
      console.error('[createOrganization] Error creating organization:', orgError);
      throw orgError;
    }

    // 2. Adicionar owner como membro
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: params.owner_id,
        role: 'owner',
      });

    if (memberError) {
      console.error('[createOrganization] Error adding owner as member:', memberError);
      // Rollback: deletar organização criada
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      throw memberError;
    }

    // console.log(`[createOrganization] ✅ Organization created: ${organization.id} (${params.plan})`);

    return {
      success: true,
      organization,
    };
  } catch (error: any) {
    console.error('[createOrganization] Fatal error:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar organização',
    };
  }
}

// =====================================================
// GET ORGANIZATION BY ID
// =====================================================
export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('[getOrganizationById] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getOrganizationById] Fatal error:', error);
    return null;
  }
}

// =====================================================
// GET ORGANIZATION BY SUBSCRIPTION ID
// Usado pelos webhooks do Stripe
// =====================================================
export async function getOrganizationBySubscriptionId(
  subscriptionId: string
): Promise<Organization | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();

    if (error) {
      console.error('[getOrganizationBySubscriptionId] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getOrganizationBySubscriptionId] Fatal error:', error);
    return null;
  }
}

// =====================================================
// GET USER'S ORGANIZATIONS
// Retorna todas as organizações que o usuário é membro
// =====================================================
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select(
        `
        organization_id,
        organizations (*)
      `
      )
      .eq('user_id', userId);

    if (error) {
      console.error('[getUserOrganizations] Error:', error);
      return [];
    }

    if (!data) return [];

    // Extrair organizações do join
    const organizations = data
      .map((item: any) => item.organizations)
      .filter((org): org is Organization => org !== null);

    return organizations;
  } catch (error) {
    console.error('[getUserOrganizations] Fatal error:', error);
    return [];
  }
}

// =====================================================
// GET ACTIVE ORGANIZATION FOR USER
// Retorna a primeira organização com subscription ativa
// Usado para determinar se user tem acesso via org
// =====================================================
export async function getActiveOrganization(userId: string): Promise<Organization | null> {
  try {
    const orgs = await getUserOrganizations(userId);

    // Buscar primeira org com subscription ativa e não expirada
    const activeOrg = orgs.find((org) => {
      if (org.subscription_status !== 'active') return false;

      // Se não tem data de expiração, considera sempre ativo
      if (!org.subscription_expires_at) return true;

      // Verificar se expirou
      return new Date(org.subscription_expires_at) > new Date();
    });

    return activeOrg || null;
  } catch (error) {
    console.error('[getActiveOrganization] Error:', error);
    return null;
  }
}

// =====================================================
// UPDATE ORGANIZATION
// Atualizar dados básicos da organização
// =====================================================
export async function updateOrganization(
  organizationId: string,
  updates: Partial<Organization>
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', organizationId);

    if (error) {
      console.error('[updateOrganization] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[updateOrganization] Fatal error:', error);
    return false;
  }
}

// =====================================================
// INCREMENT ORGANIZATION USAGE
// Incrementa contador de uso compartilhado
// =====================================================
export async function incrementOrganizationUsage(
  organizationId: string,
  operation: string
): Promise<boolean> {
  try {
    const org = await getOrganizationById(organizationId);
    if (!org) {
      console.error('[incrementOrganizationUsage] Organization not found');
      return false;
    }

    const usage = org.usage_this_month || {};
    usage[operation] = (usage[operation] || 0) + 1;

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ usage_this_month: usage })
      .eq('id', organizationId);

    if (error) {
      console.error('[incrementOrganizationUsage] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[incrementOrganizationUsage] Fatal error:', error);
    return false;
  }
}

// =====================================================
// DECREMENT ORGANIZATION CREDITS
// Deduz créditos avulsos da organização
// =====================================================
export async function decrementOrganizationCredits(organizationId: string): Promise<boolean> {
  try {
    const org = await getOrganizationById(organizationId);
    if (!org) {
      console.error('[decrementOrganizationCredits] Organization not found');
      return false;
    }

    if (org.credits <= 0) {
      console.error('[decrementOrganizationCredits] No credits available');
      return false;
    }

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({ credits: org.credits - 1 })
      .eq('id', organizationId);

    if (error) {
      console.error('[decrementOrganizationCredits] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[decrementOrganizationCredits] Fatal error:', error);
    return false;
  }
}

// =====================================================
// UPDATE ORGANIZATION SUBSCRIPTION STATUS
// Atualizar status da subscription (usado pelos webhooks)
// =====================================================
export async function updateOrganizationSubscription(
  subscriptionId: string,
  updates: {
    subscription_status?: string;
    subscription_expires_at?: string | null;
  }
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('subscription_id', subscriptionId);

    if (error) {
      console.error('[updateOrganizationSubscription] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[updateOrganizationSubscription] Fatal error:', error);
    return false;
  }
}

// =====================================================
// DELETE ORGANIZATION
// Remove organização e todos os membros (cascade)
// =====================================================
export async function deleteOrganization(organizationId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) {
      console.error('[deleteOrganization] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[deleteOrganization] Fatal error:', error);
    return false;
  }
}
