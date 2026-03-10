/**
 * Usage Limits System
 * Sistema de controle de acesso e registro de uso
 *
 * ATUALIZADO: Março 2026
 * - Modelo BYOK: SEM limites de geração (usuário usa sua chave Gemini)
 * - Limites removidos de todos os planos
 * - Mantém: gating de features por plano, tracking de uso (analytics), checks de assinatura
 */

import { supabaseAdmin } from '../supabase';
import { logger } from '../logger';
import type { PlanType } from '../billing/types';

// ============================================================================
// DEFINIÇÃO DE LIMITES (BYOK — todos ilimitados)
// ============================================================================

export interface UsageLimits {
  editorGenerations: number;  // -1 = ilimitado (BYOK)
  aiRequests: number;
  toolsUsage: number;
  removeBackground?: number;
  enhance4K?: number;
  colorMatch?: number;
  splitA4?: number;
}

/**
 * BYOK: Todos os planos têm gerações ilimitadas (-1).
 * O custo da API Gemini é do usuário (chave gratuita do Google).
 * Diferenciação entre planos é por features (cloud, tools, ads), não limites.
 */
export const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free: {
    editorGenerations: -1,
    aiRequests: -1,
    toolsUsage: -1,
    removeBackground: -1,
    enhance4K: -1,
    colorMatch: -1,
    splitA4: -1
  },
  ink: {
    editorGenerations: -1,
    aiRequests: -1,
    toolsUsage: -1,
    removeBackground: -1,
    enhance4K: -1,
    colorMatch: -1,
    splitA4: -1
  },
  pro: {
    editorGenerations: -1,
    aiRequests: -1,
    toolsUsage: -1,
    removeBackground: -1,
    enhance4K: -1,
    colorMatch: -1,
    splitA4: -1
  },
  studio: {
    editorGenerations: -1,
    aiRequests: -1,
    toolsUsage: -1,
    removeBackground: -1,
    enhance4K: -1,
    colorMatch: -1,
    splitA4: -1
  }
};

// ============================================================================
// TIPOS DE USO
// ============================================================================

export type UsageType =
  | 'editor_generation'
  | 'ai_request'
  | 'tool_usage';

// ============================================================================
// VERIFICAÇÃO DE LIMITES
// ============================================================================

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate?: Date;
  warning?: boolean;          // 🛡️ NOVO: Alerta se próximo ao limite
  warningMessage?: string;    // 🛡️ NOVO: Mensagem de warning
  usagePercentage?: number;   // 🛡️ NOVO: Percentual de uso
}

/**
 * Verifica se o usuário pode acessar (assinatura ativa, não bloqueado).
 * BYOK: não há limite de gerações — apenas checks de status da conta.
 */
export async function checkAccess(userId: string): Promise<LimitCheckResult> {
  return checkAccountStatus(userId);
}

// Aliases mantidos para backward compatibility (todas redirecionam para checkAccess)
export const checkEditorLimit = checkAccess;
export const checkAILimit = checkAccess;
export const checkToolsLimit = checkAccess;
export const checkRemoveBackgroundLimit = checkAccess;
export const checkEnhance4KLimit = checkAccess;
export const checkColorMatchLimit = checkAccess;
export const checkGenerateIdeaLimit = checkAccess;
export const checkSplitA4Limit = checkAccess;

/**
 * Verifica status da conta (assinatura, bloqueio, cortesia).
 * NÃO verifica limites de geração — modelo BYOK é ilimitado.
 */
async function checkAccountStatus(userId: string): Promise<LimitCheckResult> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('plan, admin_courtesy, admin_courtesy_expires_at, is_paid, is_blocked, blocked_reason, subscription_expires_at, subscription_status, asaas_subscription_id')
      .eq('id', userId)
      .single();

    const plan = (user?.plan || 'free') as PlanType;

    // Verificar cortesia PRIMEIRO (ignora bloqueios de pagamento automáticos)
    const isCourtesy = user?.admin_courtesy === true;
    const courtesyExpiresAt = user?.admin_courtesy_expires_at ? new Date(user.admin_courtesy_expires_at) : null;
    const isCourtesyActive = isCourtesy && courtesyExpiresAt && new Date() < courtesyExpiresAt;

    if (isCourtesy && courtesyExpiresAt && !isCourtesyActive) {
      logger.warn('[Limits] Cortesia expirada', { userId, expiresAt: courtesyExpiresAt.toISOString() });
    }

    if (isCourtesyActive) {
      return { allowed: true, remaining: -1, limit: -1, usagePercentage: 0 };
    }

    // Verificação de assinatura expirada (auto-bloqueio)
    if (
      plan !== 'free' &&
      user?.is_paid === true &&
      user?.asaas_subscription_id &&
      user?.subscription_expires_at
    ) {
      const expiresAt = new Date(user.subscription_expires_at);
      if (expiresAt < new Date()) {
        logger.warn('[Limits] Assinatura expirada', { userId, subscriptionId: user.asaas_subscription_id, expiresAt: expiresAt.toISOString() });

        // Auto-bloquear (fire-and-forget)
        supabaseAdmin.from('users').update({
          is_blocked: true,
          blocked_reason: 'Assinatura expirada - pagamento não renovado',
          blocked_at: new Date().toISOString(),
          subscription_status: 'expired',
        }).eq('id', userId).then(({ error }) => {
          if (error) logger.error('[Limits] Erro ao auto-bloquear', { userId, error });
          else logger.info('[Limits] Usuário auto-bloqueado por assinatura expirada', { userId });
        });

        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          usagePercentage: 100,
          warningMessage: 'Sua assinatura expirou. Por favor, renove seu plano para continuar usando o Black Line Pro.'
        };
      }
    }

    // Bloqueio global
    if (user?.is_blocked === true) {
      logger.warn('[Limits] Usuário bloqueado', { userId, reason: user.blocked_reason });
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        usagePercentage: 100,
        warningMessage: 'Sua conta está limitada devido a pendências de pagamento ou análise de segurança. Por favor, regularize sua situação no painel financeiro.'
      };
    }

    // BYOK: acesso liberado, sem limite
    return { allowed: true, remaining: -1, limit: -1, usagePercentage: 0 };
  } catch (error: unknown) {
    logger.error('[Limits] Erro ao verificar acesso', { userId, error });
    return { allowed: false, remaining: 0, limit: 0, usagePercentage: 0 };
  }
}

// ============================================================================
// REGISTRO DE USO
// ============================================================================

export interface RecordUsageParams {
  userId: string;
  type: UsageType;
  operationType?: string; // Tipo específico da operação (ex: "split_with_gemini", "split_only")
  cost?: number;           // Custo monetário da operação
  metadata?: Record<string, any>;
}

/**
 * Registra uso na tabela ai_usage
 */
export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const { userId, type, operationType, cost, metadata } = params;

  // Log para depuração de custos em tempo real
  logger.debug('[Usage] Registrando uso', {
    type,
    operationType: operationType || type,
    userId,
    cost,
    hasMetadata: !!metadata
  });

  try {
    const { error } = await supabaseAdmin
      .from('ai_usage')
      .insert({
        user_id: userId,
        usage_type: type,
        operation_type: operationType || type, // Fallback para type se não fornecido
        cost: cost || 0,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      logger.error('[Limits] Erro ao registrar uso no banco', { error });
    } else {
      logger.info('[Usage] Uso registrado com sucesso', { cost: cost || 0 });
    }
  } catch (error) {
    logger.error('[Limits] Erro fatal ao registrar uso', error);
  }
}

// ============================================================================
// CONSULTAS DE USO
// ============================================================================

/**
 * Obtém estatísticas de uso do mês atual
 */
export async function getMonthlyUsage(userId: string) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usage, error } = await supabaseAdmin
    .from('ai_usage')
    .select('usage_type')
    .eq('user_id', userId)
    .gte('created_at', firstDayOfMonth.toISOString());

  if (error) {
    logger.error('[Limits] Erro ao buscar uso mensal', { error });
    return {
      editorGenerations: 0,
      aiRequests: 0,
      toolsUsage: 0
    };
  }

  return {
    editorGenerations: usage?.filter(u => u.usage_type === 'editor_generation').length || 0,
    aiRequests: usage?.filter(u => u.usage_type === 'ai_request').length || 0,
    toolsUsage: usage?.filter(u => u.usage_type === 'tool_usage').length || 0
  };
}

/**
 * Obtém todos os limites do usuário de uma vez
 */
export async function getAllLimits(userId: string) {
  const [editor, ai, tools] = await Promise.all([
    checkEditorLimit(userId),
    checkAILimit(userId),
    checkToolsLimit(userId)
  ]);

  return {
    editor,
    ai,
    tools
  };
}

export async function hasAnyTrialRemaining(userId: string): Promise<boolean> {
  try {
    const [editor, idea, removeBg, enhance, color, split] = await Promise.all([
      checkEditorLimit(userId),
      checkGenerateIdeaLimit(userId),
      checkRemoveBackgroundLimit(userId),
      checkEnhance4KLimit(userId),
      checkColorMatchLimit(userId),
      checkSplitA4Limit(userId)
    ]);

    return editor.allowed || idea.allowed || removeBg.allowed || enhance.allowed || color.allowed || split.allowed;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formata mensagem de acesso negado
 */
export function getLimitMessage(
  _type: UsageType,
  _limit: number,
  _resetDate?: Date
): string {
  return 'Sua conta está com acesso restrito. Verifique sua assinatura ou regularize pendências.';
}
