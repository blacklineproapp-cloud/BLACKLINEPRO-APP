/**
 * Admin Audit Log System
 * Registra todas as ações administrativas para segurança e compliance
 */

import { supabaseAdmin } from './supabase';

export type AdminAction =
  | 'grant_courtesy'
  | 'revoke_courtesy'
  | 'renew_courtesy'
  | 'add_credits'
  | 'remove_credits'
  | 'reset_usage'
  | 'block_user'
  | 'unblock_user'
  | 'change_plan'
  | 'delete_user'
  | 'refund_payment'
  | 'cancel_subscription'
  | 'send_courtesy_links';

interface AuditLogEntry {
  adminId: string;
  action: AdminAction;
  targetUserId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra uma ação administrativa no audit log
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_id: entry.adminId,
        action: entry.action,
        target_user_id: entry.targetUserId,
        metadata: entry.metadata,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Audit] Erro ao registrar ação:', error);
      // Não lançar erro para não bloquear a operação principal
    } else {
      console.log(`[Audit] ✅ ${entry.action} registrado para admin ${entry.adminId}`);
    }
  } catch (err) {
    console.error('[Audit] Erro inesperado:', err);
  }
}

/**
 * Busca histórico de ações de um admin
 */
export async function getAdminHistory(
  adminId: string,
  limit: number = 50
): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_log')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Audit] Erro ao buscar histórico:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca ações relacionadas a um usuário específico
 */
export async function getUserAuditHistory(
  targetUserId: string,
  limit: number = 50
): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_log')
    .select('*')
    .eq('target_user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Audit] Erro ao buscar histórico do usuário:', error);
    return [];
  }

  return data || [];
}
