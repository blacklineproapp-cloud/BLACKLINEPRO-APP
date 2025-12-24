/**
 * Usage Limits System
 * Sistema de controle de limites por plano
 */

import { supabaseAdmin } from '../supabase';
import type { PlanType } from '../stripe/types';

// ============================================================================
// DEFINIÇÃO DE LIMITES
// ============================================================================

export interface UsageLimits {
  editorGenerations: number;  // -1 = ilimitado, 0 = bloqueado
  aiRequests: number;
  toolsUsage: number;
}

export const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free: {
    editorGenerations: 0,    // Não tem acesso
    aiRequests: 0,           // Não tem acesso
    toolsUsage: 0            // Não tem acesso
  },
  editor_only: {
    editorGenerations: 50,   // 50 gerações por mês
    aiRequests: 0,           // Não tem acesso à IA
    toolsUsage: 0            // Não tem acesso às ferramentas
  },
  full_access: {
    editorGenerations: -1,   // Ilimitado
    aiRequests: 100,         // 100 requests IA por mês
    toolsUsage: -1           // Ilimitado
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
 * Função genérica para verificar limites
 */
async function checkLimit(
  userId: string,
  usageType: UsageType,
  limitKey: keyof UsageLimits
): Promise<LimitCheckResult> {
  try {
    // 1. Buscar plano do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    const plan = (user?.plan || 'free') as PlanType;
    const limit = PLAN_LIMITS[plan][limitKey];

    // Se ilimitado
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1
      };
    }

    // Se bloqueado
    if (limit === 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0
      };
    }

    // 2. Calcular período de reset (primeiro dia do mês)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 3. Contar uso no mês atual
    const { count } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('usage_type', usageType)
      .gte('created_at', firstDayOfMonth.toISOString());

    const usage = count || 0;
    const remaining = Math.max(0, limit - usage);

    return {
      allowed: usage < limit,
      remaining,
      limit,
      resetDate: nextReset
    };
  } catch (error: any) {
    console.error(`[Limits] Erro ao verificar limite ${limitKey}:`, error);
    // Em caso de erro, negar acesso por segurança
    return {
      allowed: false,
      remaining: 0,
      limit: 0
    };
  }
}

// ============================================================================
// REGISTRO DE USO
// ============================================================================

export interface RecordUsageParams {
  userId: string;
  type: UsageType;
  metadata?: Record<string, any>;
}

/**
 * Registra uso na tabela ai_usage
 */
export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const { userId, type, metadata } = params;

  try {
    const { error } = await supabaseAdmin
      .from('ai_usage')
      .insert({
        user_id: userId,
        usage_type: type,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Limits] Erro ao registrar uso:', error);
    }
  } catch (error) {
    console.error('[Limits] Erro ao registrar uso:', error);
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
