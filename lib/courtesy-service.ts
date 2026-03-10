/**
 * Serviço de Verificação de Cortesia Expirada
 * Verifica e reverte usuários com cortesia expirada para FREE
 */

import { supabaseAdmin } from '@/lib/supabase';
import { logger } from './logger';

interface CourtesyCheckResult {
  isExpired: boolean;
  wasReverted: boolean;
  expiresAt: string | null;
  message?: string;
}

/**
 * Verifica se a cortesia do usuário expirou e reverte para FREE se necessário
 * 
 * SEGURANÇA:
 * - Só afeta usuários com admin_courtesy = true
 * - NÃO afeta usuários com subscription_id do Stripe (pagamento real)
 * - Só reverte se a data de expiração já passou
 */
export async function checkAndRevertExpiredCourtesy(
  userId: string
): Promise<CourtesyCheckResult> {
  try {
    // 1. Buscar dados do usuário
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, admin_courtesy, admin_courtesy_expires_at, subscription_id, plan, is_paid')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        isExpired: false,
        wasReverted: false,
        expiresAt: null,
        message: 'Usuário não encontrado'
      };
    }

    // 2. Se não tem cortesia, não fazer nada
    if (!user.admin_courtesy) {
      return {
        isExpired: false,
        wasReverted: false,
        expiresAt: null
      };
    }

    // 3. 🔒 SEGURANÇA: Se tem subscription_id do Stripe, NÃO reverter
    // Isso protege usuários que pagaram via Stripe
    if (user.subscription_id) {
      return {
        isExpired: false,
        wasReverted: false,
        expiresAt: user.admin_courtesy_expires_at,
        message: 'Usuário tem subscription do Stripe - protegido'
      };
    }

    // 4. Se não tem data de expiração, não fazer nada
    if (!user.admin_courtesy_expires_at) {
      return {
        isExpired: false,
        wasReverted: false,
        expiresAt: null,
        message: 'Cortesia sem data de expiração'
      };
    }

    // 5. Verificar se expirou
    const expirationDate = new Date(user.admin_courtesy_expires_at);
    const now = new Date();
    const isExpired = now > expirationDate;

    if (!isExpired) {
      // Ainda dentro do prazo
      return {
        isExpired: false,
        wasReverted: false,
        expiresAt: user.admin_courtesy_expires_at
      };
    }

    // 6. ⚠️ CORTESIA EXPIRADA - Reverter para FREE
    logger.info('[Courtesy] Cortesia expirada - Revertendo para FREE', { userId });

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        plan: 'free',
        is_paid: false,
        admin_courtesy: false,
        subscription_status: 'inactive',
        tools_unlocked: false
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('[Courtesy] Erro ao reverter usuário', updateError);
      return {
        isExpired: true,
        wasReverted: false,
        expiresAt: user.admin_courtesy_expires_at,
        message: `Erro ao reverter: ${updateError.message}`
      };
    }

    logger.info('[Courtesy] Usuário revertido para FREE', { userId });

    return {
      isExpired: true,
      wasReverted: true,
      expiresAt: user.admin_courtesy_expires_at,
      message: 'Cortesia expirada - revertido para FREE'
    };

  } catch (error: any) {
    logger.error('[Courtesy] Erro ao verificar cortesia', error);
    return {
      isExpired: false,
      wasReverted: false,
      expiresAt: null,
      message: `Erro: ${error.message}`
    };
  }
}

/**
 * Verifica se o usuário tem cortesia ativa (não expirada)
 */
export function hasActiveCourtesy(user: {
  admin_courtesy: boolean;
  admin_courtesy_expires_at: string | null;
}): boolean {
  if (!user.admin_courtesy) {
    return false;
  }

  if (!user.admin_courtesy_expires_at) {
    // Cortesia sem prazo (permanente antiga)
    return true;
  }

  const expirationDate = new Date(user.admin_courtesy_expires_at);
  const now = new Date();
  
  return now <= expirationDate;
}

/**
 * Retorna dias restantes de cortesia
 */
export function getCourtesyDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const expirationDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}
