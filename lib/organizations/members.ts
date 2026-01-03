// =====================================================
// ORGANIZATION MEMBERS LIBRARY
// Gerenciamento de membros (adicionar, remover, listar)
// =====================================================

import { supabaseAdmin } from '@/lib/supabase';
import { getOrganizationById } from './index';
import type {
  OrganizationMember,
  OrganizationMemberWithUser,
  RemoveMemberResponse,
} from '@/lib/types/organization';
import { ORGANIZATION_MEMBER_LIMITS } from '@/lib/types/organization';

// =====================================================
// GET ORGANIZATION MEMBERS
// Retorna todos os membros com dados do usuário
// =====================================================
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMemberWithUser[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select(
        `
        *,
        user:users!user_id (
          id,
          clerk_id,
          name,
          email,
          picture
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[getOrganizationMembers] Error:', error);
      return [];
    }

    return (data as any[]) || [];
  } catch (error) {
    console.error('[getOrganizationMembers] Fatal error:', error);
    return [];
  }
}

// =====================================================
// GET MEMBER COUNT
// Conta quantos membros a organização tem
// =====================================================
export async function getMemberCount(organizationId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[getMemberCount] Error:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[getMemberCount] Fatal error:', error);
    return 0;
  }
}

// =====================================================
// IS ORGANIZATION MEMBER
// Verifica se usuário é membro da organização
// =====================================================
export async function isOrganizationMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    return !!data && !error;
  } catch (error) {
    return false;
  }
}

// =====================================================
// IS ORGANIZATION OWNER
// Verifica se usuário é owner da organização
// =====================================================
export async function isOrganizationOwner(
  organizationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    return !!data && !error;
  } catch (error) {
    return false;
  }
}

// =====================================================
// GET MEMBER ROLE
// Retorna o role do usuário na organização
// =====================================================
export async function getMemberRole(
  organizationId: string,
  userId: string
): Promise<'owner' | 'member' | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return data.role as 'owner' | 'member';
  } catch (error) {
    return null;
  }
}

// =====================================================
// CAN ADD MORE MEMBERS
// Verifica se ainda pode adicionar membros
// Studio = 3 | Enterprise = 5
// =====================================================
export async function canAddMoreMembers(organizationId: string): Promise<boolean> {
  try {
    const org = await getOrganizationById(organizationId);
    if (!org) {
      console.error('[canAddMoreMembers] Organization not found');
      return false;
    }

    const maxMembers = ORGANIZATION_MEMBER_LIMITS[org.plan];
    const currentCount = await getMemberCount(organizationId);

    return currentCount < maxMembers;
  } catch (error) {
    console.error('[canAddMoreMembers] Error:', error);
    return false;
  }
}

// =====================================================
// ADD MEMBER
// Adiciona usuário como membro da organização
// NOTA: O trigger do banco valida o limite automaticamente
// =====================================================
export async function addMember(
  organizationId: string,
  userId: string,
  role: 'owner' | 'member' = 'member'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se já é membro
    const isMember = await isOrganizationMember(organizationId, userId);
    if (isMember) {
      return { success: false, error: 'Usuário já é membro da organização' };
    }

    // Tentar adicionar (trigger valida limite)
    const { error } = await supabaseAdmin.from('organization_members').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
    });

    if (error) {
      console.error('[addMember] Error:', error);

      // Se erro menciona limite, retornar mensagem específica
      if (error.message.includes('Limite de')) {
        return { success: false, error: error.message };
      }

      return { success: false, error: 'Erro ao adicionar membro' };
    }

    // console.log(`[addMember] ✅ Member added: ${userId} to org ${organizationId} as ${role}`);
    return { success: true };
  } catch (error: any) {
    console.error('[addMember] Fatal error:', error);
    return { success: false, error: error.message || 'Erro ao adicionar membro' };
  }
}

// =====================================================
// REMOVE MEMBER
// Remove usuário da organização
// =====================================================
export async function removeMember(
  organizationId: string,
  userId: string,
  removedBy: string
): Promise<RemoveMemberResponse> {
  try {
    // 1. Verificar se quem está removendo é owner
    const isOwner = await isOrganizationOwner(organizationId, removedBy);
    if (!isOwner) {
      return { success: false, error: 'Apenas o owner pode remover membros' };
    }

    // 2. Verificar se usuário é membro
    const isMember = await isOrganizationMember(organizationId, userId);
    if (!isMember) {
      return { success: false, error: 'Usuário não é membro da organização' };
    }

    // 3. Não pode remover o próprio owner
    const org = await getOrganizationById(organizationId);
    if (org?.owner_id === userId) {
      return {
        success: false,
        error: 'Não é possível remover o owner da organização',
      };
    }

    // 4. Remover membro
    const { error } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      console.error('[removeMember] Error:', error);
      return { success: false, error: 'Erro ao remover membro' };
    }

    // console.log(`[removeMember] ✅ Member removed: ${userId} from org ${organizationId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[removeMember] Fatal error:', error);
    return { success: false, error: error.message || 'Erro ao remover membro' };
  }
}

// =====================================================
// TRANSFER OWNERSHIP
// Transfere ownership da organização para outro membro
// =====================================================
export async function transferOwnership(
  organizationId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Verificar se quem está transferindo é o owner atual
    const org = await getOrganizationById(organizationId);
    if (!org) {
      return { success: false, error: 'Organização não encontrada' };
    }

    if (org.owner_id !== currentOwnerId) {
      return { success: false, error: 'Apenas o owner pode transferir ownership' };
    }

    // 2. Verificar se novo owner é membro
    const isMember = await isOrganizationMember(organizationId, newOwnerId);
    if (!isMember) {
      return { success: false, error: 'Novo owner deve ser membro da organização' };
    }

    // 3. Atualizar owner_id na organização
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .update({ owner_id: newOwnerId })
      .eq('id', organizationId);

    if (orgError) {
      console.error('[transferOwnership] Error updating organization:', orgError);
      return { success: false, error: 'Erro ao atualizar organização' };
    }

    // 4. Atualizar role do novo owner
    const { error: newOwnerError } = await supabaseAdmin
      .from('organization_members')
      .update({ role: 'owner' })
      .eq('organization_id', organizationId)
      .eq('user_id', newOwnerId);

    if (newOwnerError) {
      console.error('[transferOwnership] Error updating new owner role:', newOwnerError);
      // Rollback
      await supabaseAdmin
        .from('organizations')
        .update({ owner_id: currentOwnerId })
        .eq('id', organizationId);
      return { success: false, error: 'Erro ao atualizar role do novo owner' };
    }

    // 5. Atualizar role do owner antigo para member
    const { error: oldOwnerError } = await supabaseAdmin
      .from('organization_members')
      .update({ role: 'member' })
      .eq('organization_id', organizationId)
      .eq('user_id', currentOwnerId);

    if (oldOwnerError) {
      console.error('[transferOwnership] Error updating old owner role:', oldOwnerError);
      // Continuar mesmo com erro (novo owner já foi setado)
    }

    // console.log(
    //   `[transferOwnership] ✅ Ownership transferred: ${currentOwnerId} → ${newOwnerId} (org ${organizationId})`
    // );
    return { success: true };
  } catch (error: any) {
    console.error('[transferOwnership] Fatal error:', error);
    return { success: false, error: error.message || 'Erro ao transferir ownership' };
  }
}
