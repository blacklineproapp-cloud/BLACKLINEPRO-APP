/**
 * BillingService — Serviço unificado de billing para tool routes
 *
 * ATUALIZADO: Março 2026 — Modelo BYOK (sem limites de geração)
 *
 * Responsabilidades:
 * - Admin bypass
 * - Feature gating por plano (ferramentas premium requerem plano adequado)
 * - Registro de uso para analytics
 * - NÃO verifica limites de geração (BYOK = ilimitado)
 */

import { NextResponse } from 'next/server';
import { isAdmin as checkIsAdmin } from '../auth';
import {
  recordUsage,
  type LimitCheckResult,
  type UsageType,
} from './limits';
import { BRL_COST, type OperationType } from './costs';
import { logger } from '../logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface ToolAccessParams {
  /** Clerk user ID (para admin check) */
  userId: string;
  /** User object do withAuth (contém id, is_paid, subscription_status, tools_unlocked) */
  user: {
    id: string;
    is_paid: boolean;
    subscription_status: string;
    tools_unlocked: boolean;
    [key: string]: any;
  };
  /** Nome da ferramenta (para logging e metadata) */
  toolName: OperationType;
  /** Função de check — mantida para compatibilidade mas não bloqueia por limite */
  trialCheckFn?: (userId: string) => Promise<LimitCheckResult>;
  /** Mensagem quando acesso é negado (feature não incluída no plano) */
  trialDeniedMessage: string;
  /** Tipo de uso para recordUsage (default: 'tool_usage') */
  usageType?: UsageType;
  /** Tipo de subscription para a resposta de erro (default: 'tools') */
  subscriptionType?: string;
}

export interface ToolAccessResult {
  /** Se true, acesso foi negado — retorne billing.response */
  denied: boolean;
  /** Resposta HTTP pronta para retornar (só existe se denied=true) */
  response?: NextResponse;
  /** Se o usuário é admin */
  isAdmin: boolean;
  /**
   * Registra uso após operação bem-sucedida (analytics).
   * Chamar após o processamento da ferramenta.
   */
  recordUsage: (extraMetadata?: Record<string, any>) => Promise<void>;
}

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

/**
 * Verifica acesso a uma ferramenta (admin bypass + feature gating).
 * BYOK: NÃO verifica limites de geração — apenas se o plano inclui a feature.
 *
 * Fluxo:
 * 1. Admin bypass
 * 2. Check feature access (is_paid + active + tools_unlocked)
 * 3. Fornece recordUsage helper (analytics)
 */
export async function checkToolAccess(params: ToolAccessParams): Promise<ToolAccessResult> {
  const {
    userId,
    user,
    toolName,
    trialDeniedMessage,
    usageType = 'tool_usage',
    subscriptionType = 'tools',
  } = params;

  const isAdmin = await checkIsAdmin(userId);

  const makeRecordUsage = () => async (extraMetadata?: Record<string, any>) => {
    try {
      await recordUsage({
        userId: user.id,
        type: usageType,
        operationType: toolName,
        cost: BRL_COST[toolName],
        metadata: {
          tool: toolName,
          operation: toolName,
          is_admin: isAdmin,
          ...extraMetadata,
        },
      });
    } catch (e) {
      logger.warn(`[Billing] Erro ao registrar uso de ${toolName}`, { error: e });
    }
  };

  // Admin bypass
  if (isAdmin) {
    return { denied: false, isAdmin: true, recordUsage: makeRecordUsage() };
  }

  // Feature gating: ferramentas premium requerem assinatura com tools_unlocked
  const hasAccess = user.is_paid && user.subscription_status === 'active' && user.tools_unlocked;

  if (!hasAccess) {
    return {
      denied: true,
      isAdmin: false,
      response: NextResponse.json(
        {
          error: 'Acesso Restrito',
          message: trialDeniedMessage,
          requiresSubscription: true,
          subscriptionType,
        },
        { status: 403 }
      ),
      recordUsage: makeRecordUsage(),
    };
  }

  return { denied: false, isAdmin: false, recordUsage: makeRecordUsage() };
}

/**
 * Verifica acesso para funcionalidades que exigem assinatura paga.
 * BYOK: Apenas gating por plano, sem limite de gerações.
 */
export async function checkPaidAccess(params: {
  userId: string;
  user: { id: string; is_paid: boolean; subscription_status: string; [key: string]: any };
  featureName: string;
  deniedMessage: string;
  usageType?: UsageType;
  operationType?: OperationType;
}): Promise<ToolAccessResult> {
  const {
    userId,
    user,
    featureName,
    deniedMessage,
    usageType = 'ai_request',
    operationType,
  } = params;

  const isAdmin = await checkIsAdmin(userId);

  const makeRecordUsage = () => async (extraMetadata?: Record<string, any>) => {
    try {
      const opType = operationType || featureName;
      await recordUsage({
        userId: user.id,
        type: usageType,
        operationType: opType,
        cost: operationType ? BRL_COST[operationType] : 0,
        metadata: {
          tool: featureName,
          operation: opType,
          is_admin: isAdmin,
          ...extraMetadata,
        },
      });
    } catch (e) {
      logger.warn(`[Billing] Erro ao registrar uso de ${featureName}`, { error: e });
    }
  };

  if (isAdmin) {
    return { denied: false, isAdmin: true, recordUsage: makeRecordUsage() };
  }

  const isPaidPlan = user.is_paid && user.subscription_status === 'active';
  if (!isPaidPlan) {
    return {
      denied: true,
      isAdmin: false,
      response: NextResponse.json(
        {
          error: 'Acesso negado',
          message: deniedMessage,
          requiresSubscription: true,
          subscriptionType: 'subscription',
        },
        { status: 403 }
      ),
      recordUsage: makeRecordUsage(),
    };
  }

  return { denied: false, isAdmin: false, recordUsage: makeRecordUsage() };
}
