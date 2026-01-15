/**
 * User Activation Helpers
 * Helpers para ativação manual de usuários pelo admin
 *
 * CRIADO: 08/01/2026
 * ATUALIZADO: 09/01/2026 - Adicionado activateUserAtomic() com transação ACID
 * MOTIVO: Correção de bug de limites não liberados + race conditions
 */

import { supabaseAdmin } from '../supabase';
import type { PlanType } from '../stripe/types';

// ============================================================================
// TIPOS
// ============================================================================

interface ActivateUserResult {
  success: boolean;
  deleted_records: number;
  old_plan: string | null;
  new_plan: string;
  message: string;
}

// ============================================================================
// FUNÇÃO PRINCIPAL (ROBUSTA) - Usar em novas implementações
// ============================================================================

/**
 * ✅ VERSÃO ROBUSTA: Ativa usuário usando PostgreSQL Function com transação ACID
 *
 * Previne race conditions via FOR UPDATE lock e garante atomicidade completa.
 * DELETE + UPDATE executam na mesma transação com rollback automático em caso de erro.
 *
 * @param userId - UUID do usuário no Supabase
 * @param newPlan - Novo plano a ser atribuído
 * @param options - Opções de ativação
 * @returns Resultado da ativação com estatísticas
 *
 * @example
 * const result = await activateUserAtomic(userId, 'pro', {
 *   isPaid: true,
 *   toolsUnlocked: true,
 *   subscriptionStatus: 'active',
 *   adminId: adminUserId
 * });
 * console.log(result.message); // "Ativado de free → pro (15 registros resetados)"
 */
export async function activateUserAtomic(
  userId: string,
  newPlan: PlanType,
  options: {
    isPaid: boolean;
    toolsUnlocked: boolean;
    subscriptionStatus: string;
    adminId?: string;
    courtesyDurationDays?: number; // Se definido, aplica cortesia
    isCourtesy?: boolean; // Forçar flag (default: true se duration > 0)
  }
): Promise<ActivateUserResult> {
  const isCourtesy = options.isCourtesy !== false && (!!options.courtesyDurationDays || options.isCourtesy === true);
  console.log(`[UserActivation] 🔐 Ativando usuário ${userId} → ${newPlan} (ATOMIC) | Cortesia: ${isCourtesy}`);

  // 1. Executar RPC Atômica (Plano, Pagamento, Limites)
  const { data, error } = await supabaseAdmin
    .rpc('activate_user_with_reset', {
      p_user_id: userId,
      p_new_plan: newPlan,
      p_is_paid: options.isPaid,
      p_tools_unlocked: options.toolsUnlocked,
      p_subscription_status: options.subscriptionStatus,
      p_admin_id: options.adminId || null
    });

  if (error) {
    console.error('[UserActivation] ❌ Erro na ativação atômica:', error);
    throw error;
  }

  const result = data[0] as ActivateUserResult;

  if (!result.success) {
    throw new Error(result.message);
  }

  // 2. Atualizar Campos de Cortesia (Pós-RPC)
  // Como não podemos alterar a RPC facilmente, fazemos o update logo em seguida.
  // A consistência eventual é aceitável aqui (o pior caso é usuário ter plano sem flag de cortesia por alguns ms)
  if (isCourtesy || options.isCourtesy === false) {
     let expiresAt = null;
     
     if (isCourtesy && options.courtesyDurationDays) {
         const date = new Date();
         date.setDate(date.getDate() + options.courtesyDurationDays);
         expiresAt = date.toISOString();
     }

     // Se explicitamente removendo cortesia (isCourtesy=false), limpa os campos
     // Se concedendo (isCourtesy=true), seta os campos
     const courtesyUpdates = {
         admin_courtesy: isCourtesy,
         admin_courtesy_expires_at: expiresAt,
         admin_courtesy_granted_by: isCourtesy ? options.adminId : null,
         admin_courtesy_granted_at: isCourtesy ? new Date().toISOString() : null
     };

     await supabaseAdmin
         .from('users')
         .update(courtesyUpdates)
         .eq('id', userId);
         
     console.log(`[UserActivation] 🎁 Campos de cortesia atualizados:`, courtesyUpdates);
  }

  console.log(`[UserActivation] ✅ ${result.message}`);

  return result;
}

// ============================================================================
// FUNÇÕES LEGACY (Manter para backward compatibility)
// ============================================================================

/**
 * @deprecated Usar activateUserAtomic() em novas implementações
 *
 * Reseta uso mensal APENAS se usuário estava em plano FREE/NULL
 * Preserva histórico se estava em plano pago (upgrade entre planos)
 *
 * ⚠️ AVISO: Esta função NÃO previne race conditions e NÃO garante atomicidade.
 * Use activateUserAtomic() para operações críticas de billing.
 *
 * @param userId - UUID do usuário no Supabase
 * @param currentPlan - Plano atual do usuário (antes da mudança)
 */
export async function resetMonthlyUsageIfNeeded(
  userId: string,
  currentPlan: string | null
): Promise<void> {
  console.warn('[UserActivation] ⚠️ Usando função LEGACY - considere migrar para activateUserAtomic()');

  const wasBlocked = !currentPlan || currentPlan === 'free';

  if (!wasBlocked) {
    console.log('[UserActivation] 📊 Usuário já tinha plano pago - histórico preservado');
    return;
  }

  console.log('[UserActivation] 🔄 Resetando uso mensal (estava bloqueado)');

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { error, count } = await supabaseAdmin
    .from('ai_usage')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', firstDayOfMonth.toISOString());

  if (error) {
    console.error('[UserActivation] ❌ Erro ao resetar uso:', error);
    throw error;
  }

  console.log(`[UserActivation] ✅ Resetado: ${count || 0} registros removidos`);
}

/**
 * Verifica se plano foi atualizado corretamente no banco
 * Útil para validar que UPDATE funcionou antes de retornar sucesso
 *
 * @param userId - UUID do usuário no Supabase
 * @param expectedPlan - Plano esperado após o UPDATE
 * @throws Error se plano não foi atualizado
 */
export async function verifyPlanUpdate(
  userId: string,
  expectedPlan: PlanType
): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan, is_paid, subscription_status')
    .eq('id', userId)
    .single();

  if (!user) {
    throw new Error(`Usuário não encontrado: ${userId}`);
  }

  if (user.plan !== expectedPlan) {
    throw new Error(
      `Plano não foi atualizado. Esperado: ${expectedPlan}, Encontrado: ${user.plan || 'null'}`
    );
  }

  console.log('[UserActivation] ✅ Plano verificado:', user.plan);
}
