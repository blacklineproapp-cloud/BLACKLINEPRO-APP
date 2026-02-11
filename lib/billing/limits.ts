/**
 * Usage Limits System
 * Sistema de controle de limites por plano
 * 
 * ATUALIZADO: Dezembro 2025
 * - Novos planos: starter, pro, studio
 */

import { supabaseAdmin } from '../supabase';
import type { PlanType } from '../billing/types';

// ============================================================================
// DEFINIÇÃO DE LIMITES
// ============================================================================

// Limite Studio: 680 gerações/mês
// Com 680 gerações/mês a R$ 0,50/geração = R$ 340 de custo
// Receita Studio: R$ 300/mês → Margem controlada
export const STUDIO_LIMIT = 680;  // Gerações/mês
export const STUDIO_WARNING_THRESHOLD = 0.80;  // Alerta aos 80% (544 gerações)

export interface UsageLimits {
  editorGenerations: number;  // 0 = bloqueado, >0 = limite
  aiRequests: number;
  toolsUsage: number;          // DEPRECATED: Mantido para backward compatibility
  // 🆕 Limites individuais por ferramenta
  removeBackground?: number;   // Remove fundo
  enhance4K?: number;          // Aprimorar 4K
  colorMatch?: number;         // Combinar cores
  splitA4?: number;            // Dividir A4
}

export const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free: {
    editorGenerations: 3,    // 🎣 ISCA: 3 previews com blur (upsell)
    aiRequests: 0,           // 🔒 Bloqueado: Necessário assinatura
    toolsUsage: 0,           // DEPRECATED
    // 🔒 BLOQUEADO: Sem testes gratuitos (Exclusivo para assinantes)
    removeBackground: 0,
    enhance4K: 0,
    colorMatch: 0,
    splitA4: 0
  },
  legacy: {
    editorGenerations: 100,  // 🎁 LEGACY: Apenas editor
    aiRequests: 0,           // ❌ SEM IA avançada
    toolsUsage: 0,           // ❌ SEM ferramentas premium
    removeBackground: 0,     // ❌ SEM remove background
    enhance4K: 0,            // ❌ SEM enhance 4K
    colorMatch: 0,           // ❌ SEM color match
    splitA4: 0               // ❌ SEM split A4
  },
  starter: {
    editorGenerations: 95,   // 95 gerações por mês
    aiRequests: 0,           // Não tem acesso à IA avançada
    toolsUsage: 95,          // Uso básico de ferramentas
    removeBackground: 95,
    enhance4K: 95,
    colorMatch: 95,
    splitA4: 95
  },
  pro: {
    editorGenerations: 210,  // 210 gerações por mês
    aiRequests: 210,         // 210 requests IA por mês
    toolsUsage: 210,         // Ferramentas completas
    removeBackground: 210,
    enhance4K: 210,
    colorMatch: 210,
    splitA4: 210
  },
  studio: {
    editorGenerations: STUDIO_LIMIT,  // 680 gerações/mês
    aiRequests: STUDIO_LIMIT,         // 680 requests IA/mês
    toolsUsage: STUDIO_LIMIT,         // 680 ferramentas/mês
    removeBackground: STUDIO_LIMIT,
    enhance4K: STUDIO_LIMIT,
    colorMatch: STUDIO_LIMIT,
    splitA4: STUDIO_LIMIT
  },
  enterprise: {
    editorGenerations: 1400,  // 🏢 ENTERPRISE: Limite alto para uso profissional
    aiRequests: 1400,         // 🏢 ENTERPRISE: Limite alto
    toolsUsage: 1400,         // 🏢 ENTERPRISE: Limite alto
    removeBackground: 1400,
    enhance4K: 1400,
    colorMatch: 1400,
    splitA4: 1400
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
 * Verifica limite do editor
 */
export async function checkEditorLimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'editor_generation', 'editorGenerations');
}

/**
 * Verifica limite de IA
 */
export async function checkAILimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'ai_request', 'aiRequests');
}

/**
 * Verifica limite de ferramentas
 */
export async function checkToolsLimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'tool_usage', 'toolsUsage');
}

/**
 * 🆕 Verificadores específicos por ferramenta (para TRIAL Free)
 */
export async function checkRemoveBackgroundLimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'tool_usage', 'removeBackground', 'remove_bg');
}

export async function checkEnhance4KLimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'tool_usage', 'enhance4K', 'enhance_image');
}

export async function checkColorMatchLimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'tool_usage', 'colorMatch', 'color_match');
}

export async function checkGenerateIdeaLimit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'ai_request', 'aiRequests', 'generate_idea');
}

export async function checkSplitA4Limit(userId: string): Promise<LimitCheckResult> {
  return checkLimit(userId, 'tool_usage', 'splitA4', ['split_only', 'split_with_gemini']); 
}

/**
 * Função genérica para verificar limites
 */
async function checkLimit(
  userId: string,
  usageType: UsageType,
  limitKey: keyof UsageLimits,
  operationTypeFilter?: string | string[] // 🆕 Filtro opcional por operação(ões)
): Promise<LimitCheckResult> {
  try {
    // 1. Buscar plano e flags do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('plan, admin_courtesy, admin_courtesy_expires_at, is_paid, is_blocked, blocked_reason, subscription_expires_at, subscription_status, asaas_subscription_id')
      .eq('id', userId)
      .single();

    const plan = (user?.plan || 'free') as PlanType;

    // 🛡️ CORREÇÃO: Verificar cortesia PRIMEIRO. 
    // Se o admin deu cortesia, ela ignora bloqueios de pagamento automáticos.
    const isCourtesy = user?.admin_courtesy === true;
    const courtesyExpiresAt = user?.admin_courtesy_expires_at ? new Date(user.admin_courtesy_expires_at) : null;

    if (isCourtesy && courtesyExpiresAt) {
      const now = new Date();
      if (now < courtesyExpiresAt) {
        // Cortesia válida! Ignora qualquer is_blocked de faturamento.
        const limit = PLAN_LIMITS[plan][limitKey];
        if (limit === -1) return { allowed: true, remaining: -1, limit: -1, usagePercentage: 0 };
        // Continua para calcular uso normal mas permite o acesso
      } else {
        console.warn(`[Limits] 🔒 Usuário ${userId} (Cortesia) expirada em ${courtesyExpiresAt.toLocaleDateString('pt-BR')}`);
        // Se a cortesia expirou, aí sim verificamos o bloqueio ou bloqueamos pelo fim da cortesia
      }
    }

    // 🆕 VERIFICAÇÃO DE ASSINATURA EXPIRADA
    // Só auto-bloquear se o usuário tem uma subscription real (asaas_subscription_id)
    // e subscription_expires_at está no passado. Usuários sem subscription
    // (ex: pagamento avulso PIX antigo) não devem ser bloqueados automaticamente.
    const isCourtesyActive = isCourtesy && courtesyExpiresAt && new Date() < courtesyExpiresAt;
    if (
      !isCourtesyActive &&
      plan !== 'free' &&
      user?.is_paid === true &&
      user?.asaas_subscription_id &&
      user?.subscription_expires_at
    ) {
      const expiresAt = new Date(user.subscription_expires_at);
      if (expiresAt < new Date()) {
        console.warn(`[Limits] 🚫 Assinatura expirada para usuário ${userId}. Subscription: ${user.asaas_subscription_id}. Expirou em: ${expiresAt.toISOString()}`);

        // Auto-bloquear (fire-and-forget)
        supabaseAdmin.from('users').update({
          is_blocked: true,
          blocked_reason: 'Assinatura expirada - pagamento não renovado',
          blocked_at: new Date().toISOString(),
          subscription_status: 'expired',
        }).eq('id', userId).then(({ error }) => {
          if (error) console.error(`[Limits] Erro ao auto-bloquear ${userId}:`, error);
          else console.log(`[Limits] ✅ Usuário ${userId} auto-bloqueado por assinatura expirada`);
        });

        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          usagePercentage: 100,
          warningMessage: 'Sua assinatura expirou. Por favor, renove seu plano para continuar usando o StencilFlow.'
        };
      }
    }

    // 🆕 BLOQUEIO GLOBAL (Só aplica se NÃO for cortesia ativa)
    if (user?.is_blocked === true) {
      console.warn(`[Limits] 🚫 Usuário ${userId} bloqueado. Motivo: ${user.blocked_reason}`);
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        usagePercentage: 100,
        warningMessage: 'Sua conta está limitada devido a pendências de pagamento ou análise de segurança. Por favor, regularize sua situação no painel financeiro.'
      };
    }

    const limit = PLAN_LIMITS[plan][limitKey];

    // Suporte para planos ilimitados (-1) - reservado para casos especiais
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        usagePercentage: 0
      };
    }

    // Se bloqueado
    if (limit === 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        usagePercentage: 0
      };
    }

    // 2. Calcular período de reset (primeiro dia do mês)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 3. Contar uso no mês atual
    let query = supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('usage_type', usageType)
      .gte('created_at', firstDayOfMonth.toISOString());

    // 🆕 Se fornecido filtro por operação, aplicar
    if (operationTypeFilter) {
      if (Array.isArray(operationTypeFilter)) {
        query = query.in('operation_type', operationTypeFilter);
      } else {
        query = query.eq('operation_type', operationTypeFilter);
      }
    }

    const { count } = await query;

    const usage = count || 0;
    const limitValue = limit || 0;
    const remaining = Math.max(0, limitValue - usage);
    const usagePercentage = limitValue > 0 ? (usage / limitValue) * 100 : 0;

    // 🛡️ SISTEMA DE WARNING: Alerta quando próximo ao limite
    const isNearLimit = usagePercentage >= (STUDIO_WARNING_THRESHOLD * 100);
    const isStudioPlan = plan === 'studio';

    let warningMessage: string | undefined;
    if (isNearLimit && isStudioPlan) {
      const percentUsed = Math.round(usagePercentage);
      warningMessage = `⚠️ Você já usou ${percentUsed}% do limite justo (${usage}/${limit} gerações). O limite renova dia ${nextReset.getDate()}.`;
    } else if (isNearLimit) {
      const percentUsed = Math.round(usagePercentage);
      warningMessage = `Você já usou ${percentUsed}% do seu limite mensal (${usage}/${limit}).`;
    }

    return {
      allowed: usage < limitValue,
      remaining,
      limit: limitValue,
      resetDate: nextReset,
      warning: isNearLimit,
      warningMessage,
      usagePercentage: Math.round(usagePercentage)
    };
  } catch (error: any) {
    console.error(`[Limits] Erro ao verificar limite ${limitKey}:`, error);
    // Em caso de erro, negar acesso por segurança
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      usagePercentage: 0
    };
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
  console.log(`[Usage] Registrando uso: ${type}/${operationType || type}`, {
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
      console.error('[Limits] Erro ao registrar uso no banco:', error);
    } else {
      console.log(`[Usage] ✅ Uso registrado com sucesso (Custo: ${cost || 0})`);
    }
  } catch (error) {
    console.error('[Limits] Erro fatal ao registrar uso:', error);
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
    console.error('[Limits] Erro ao buscar uso mensal:', error);
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
 * Formata mensagem de limite atingido
 */
export function getLimitMessage(
  type: UsageType,
  limit: number,
  resetDate?: Date
): string {
  const typeLabels: Record<UsageType, string> = {
    editor_generation: 'gerações do editor',
    ai_request: 'requests de IA',
    tool_usage: 'uso de ferramentas'
  };

  const resetText = resetDate
    ? ` Reseta em ${resetDate.toLocaleDateString('pt-BR')}.`
    : '';

  return `Você atingiu o limite de ${limit} ${typeLabels[type]} por mês.${resetText} Faça upgrade para continuar usando.`;
}

// ============================================================================
// 🛡️ SISTEMA DE MONITORAMENTO (STUDIO)
// ============================================================================

export interface StudioUsageReport {
  userId: string;
  email: string;
  usage: number;
  limit: number;
  percentage: number;
  warningLevel: 'normal' | 'warning' | 'critical';
  costEstimate: number;  // Custo estimado em API
}

/**
 * 🛡️ Lista usuários Studio e seu uso atual
 * Útil para monitoramento semanal
 */
export async function getStudioUsageReport(): Promise<StudioUsageReport[]> {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Buscar todos os usuários Studio
    const { data: studioUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, plan')
      .eq('plan', 'studio');

    if (usersError || !studioUsers) {
      console.error('[Monitor] Erro ao buscar usuários Studio:', usersError);
      return [];
    }

    // 2. Para cada usuário, calcular uso mensal
    const reports = await Promise.all(
      studioUsers.map(async (user) => {
        const { count } = await supabaseAdmin
          .from('ai_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', firstDayOfMonth.toISOString());

        const usage = count || 0;
        const percentage = (usage / STUDIO_LIMIT) * 100;

        // Calcular nível de warning
        let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
        if (percentage >= 100) {
          warningLevel = 'critical';  // Atingiu o limite
        } else if (percentage >= 80) {
          warningLevel = 'warning';   // Próximo ao limite
        }

        // Estimar custo (R$ 0,50 por geração)
        const costEstimate = usage * 0.50;

        return {
          userId: user.id,
          email: user.email,
          usage,
          limit: STUDIO_LIMIT,
          percentage: Math.round(percentage),
          warningLevel,
          costEstimate: Math.round(costEstimate * 100) / 100
        };
      })
    );

    // Ordenar por uso (maior primeiro)
    return reports.sort((a, b) => b.usage - a.usage);
  } catch (error) {
    console.error('[Monitor] Erro ao gerar relatório Studio:', error);
    return [];
  }
}

/**
 * 🛡️ Identifica usuários Studio em risco de atingir o limite
 * Retorna apenas usuários acima de 80% do limite
 */
export async function getStudioHighUsageAlerts(): Promise<StudioUsageReport[]> {
  const allReports = await getStudioUsageReport();
  return allReports.filter(report => report.percentage >= 80);
}

/**
 * 🛡️ Calcula estatísticas agregadas de uso Studio
 */
export async function getStudioAggregateStats() {
  const reports = await getStudioUsageReport();

  if (reports.length === 0) {
    return {
      totalUsers: 0,
      totalUsage: 0,
      totalCost: 0,
      avgUsagePerUser: 0,
      usersAtRisk: 0
    };
  }

  const totalUsage = reports.reduce((sum, r) => sum + r.usage, 0);
  const totalCost = reports.reduce((sum, r) => sum + r.costEstimate, 0);
  const usersAtRisk = reports.filter(r => r.percentage >= 80).length;

  return {
    totalUsers: reports.length,
    totalUsage,
    totalCost: Math.round(totalCost * 100) / 100,
    avgUsagePerUser: Math.round(totalUsage / reports.length),
    usersAtRisk
  };
}
