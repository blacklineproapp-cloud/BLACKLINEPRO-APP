// =====================================================
// ORGANIZATION INVITES LIBRARY
// Sistema de convites por email com tokens únicos
// =====================================================

import { supabaseAdmin } from '@/lib/supabase';
import { canAddMoreMembers, addMember } from './members';
import type {
  OrganizationInvite,
  InviteMemberResponse,
  AcceptInviteResponse,
} from '@/lib/types/organization';
import { INVITE_EXPIRATION_HOURS } from '@/lib/types/organization';
import { randomBytes } from 'crypto';

// =====================================================
// GENERATE INVITE TOKEN
// Gera token único de 32 bytes
// =====================================================
function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

// =====================================================
// CREATE INVITE
// Cria convite para adicionar membro por email
// =====================================================
export async function createInvite(params: {
  organizationId: string;
  email: string;
  invitedBy: string;
}): Promise<InviteMemberResponse> {
  try {
    // 1. Verificar se ainda pode adicionar membros
    const canAdd = await canAddMoreMembers(params.organizationId);
    if (!canAdd) {
      return { success: false, error: 'Limite de membros atingido' };
    }

    // 2. Verificar se já existe convite pendente para este email
    const { data: existing } = await supabaseAdmin
      .from('organization_invites')
      .select('id')
      .eq('organization_id', params.organizationId)
      .eq('email', params.email)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existing) {
      return {
        success: false,
        error: 'Já existe um convite pendente para este email',
      };
    }

    // 3. Verificar se email já é membro (checando via users.email)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', params.email)
      .single();

    if (existingUser) {
      const { data: memberCheck } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', params.organizationId)
        .eq('user_id', existingUser.id)
        .single();

      if (memberCheck) {
        return { success: false, error: 'Este usuário já é membro da organização' };
      }
    }

    // 4. Criar convite
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRATION_HOURS);

    const { data: invite, error } = await supabaseAdmin
      .from('organization_invites')
      .insert({
        organization_id: params.organizationId,
        email: params.email,
        role: 'member',
        token: generateInviteToken(),
        invited_by: params.invitedBy,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[createInvite] Error:', error);
      return { success: false, error: 'Erro ao criar convite' };
    }

    // console.log(`[createInvite] ✅ Invite created for ${params.email} to org ${params.organizationId}`);

    return {
      success: true,
      invite,
    };
  } catch (error: any) {
    console.error('[createInvite] Fatal error:', error);
    return { success: false, error: error.message || 'Erro ao criar convite' };
  }
}

// =====================================================
// GET INVITE BY TOKEN
// Busca convite pelo token único
// =====================================================
export async function getInviteByToken(token: string): Promise<OrganizationInvite | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.error('[getInviteByToken] Error:', error);
      return null;
    }

    // Verificar se expirou
    if (new Date(data.expires_at) < new Date()) {
      // console.log('[getInviteByToken] Invite expired:', token);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getInviteByToken] Fatal error:', error);
    return null;
  }
}

// =====================================================
// GET ORGANIZATION INVITES
// Lista todos os convites pendentes de uma organização
// =====================================================
export async function getOrganizationInvites(
  organizationId: string
): Promise<OrganizationInvite[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_invites')
      .select('*')
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getOrganizationInvites] Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[getOrganizationInvites] Fatal error:', error);
    return [];
  }
}

// =====================================================
// GET USER PENDING INVITES
// Busca convites pendentes para um email específico
// =====================================================
export async function getUserPendingInvites(email: string): Promise<OrganizationInvite[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_invites')
      .select(
        `
        *,
        organization:organizations (
          id,
          name,
          plan
        ),
        inviter:users!invited_by (
          name,
          email
        )
      `
      )
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getUserPendingInvites] Error:', error);
      return [];
    }

    return (data as any[]) || [];
  } catch (error) {
    console.error('[getUserPendingInvites] Fatal error:', error);
    return [];
  }
}

// =====================================================
// ACCEPT INVITE
// Aceita convite e adiciona usuário como membro
// =====================================================
export async function acceptInvite(
  token: string,
  userId: string
): Promise<AcceptInviteResponse> {
  try {
    // 1. Buscar convite
    const invite = await getInviteByToken(token);
    if (!invite) {
      return { success: false, error: 'Convite inválido ou expirado' };
    }

    // 2. Verificar se email do convite bate com email do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user || user.email !== invite.email) {
      return {
        success: false,
        error: 'Este convite foi enviado para outro email',
      };
    }

    // 3. Adicionar como membro (função valida limite automaticamente)
    const memberResult = await addMember(invite.organization_id, userId, invite.role);

    if (!memberResult.success) {
      return { success: false, error: memberResult.error };
    }

    // 4. Deletar convite usado
    await supabaseAdmin.from('organization_invites').delete().eq('id', invite.id);

    // 5. Buscar organização para retornar
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', invite.organization_id)
      .single();

    // console.log(`[acceptInvite] ✅ Invite accepted: ${userId} joined org ${invite.organization_id}`);

    return {
      success: true,
      organization: organization || undefined,
    };
  } catch (error: any) {
    console.error('[acceptInvite] Fatal error:', error);
    return { success: false, error: error.message || 'Erro ao aceitar convite' };
  }
}

// =====================================================
// CANCEL INVITE
// Cancela convite pendente
// =====================================================
export async function cancelInvite(
  inviteId: string,
  canceledBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar convite para verificar organização
    const { data: invite } = await supabaseAdmin
      .from('organization_invites')
      .select('organization_id')
      .eq('id', inviteId)
      .single();

    if (!invite) {
      return { success: false, error: 'Convite não encontrado' };
    }

    // Verificar se quem está cancelando é owner
    const { data: member } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', canceledBy)
      .eq('role', 'owner')
      .single();

    if (!member) {
      return { success: false, error: 'Apenas o owner pode cancelar convites' };
    }

    // Deletar convite
    const { error } = await supabaseAdmin
      .from('organization_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      console.error('[cancelInvite] Error:', error);
      return { success: false, error: 'Erro ao cancelar convite' };
    }

    // console.log(`[cancelInvite] ✅ Invite canceled: ${inviteId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[cancelInvite] Fatal error:', error);
    return { success: false, error: error.message || 'Erro ao cancelar convite' };
  }
}

// =====================================================
// CLEANUP EXPIRED INVITES
// Remove convites expirados (executar via cron)
// =====================================================
export async function cleanupExpiredInvites(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_invites')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('[cleanupExpiredInvites] Error:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    if (deletedCount > 0) {
      // console.log(`[cleanupExpiredInvites] ✅ Removed ${deletedCount} expired invites`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[cleanupExpiredInvites] Fatal error:', error);
    return 0;
  }
}
