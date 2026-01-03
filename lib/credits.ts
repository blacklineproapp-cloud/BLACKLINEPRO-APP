import { supabaseAdmin } from './supabase';
import { getActiveOrganization, incrementOrganizationUsage, decrementOrganizationCredits } from './organizations';
import type { Organization } from './types/organization';

/**
 * Sistema de Créditos StencilFlow
 *
 * ATUALIZADO: Janeiro 2026 - Suporte a Multi-Usuários (Organizations)
 *
 * Custo por operação (em créditos):
 * - Topográfico: 1 crédito
 * - Linhas: 1 crédito
 * - IA Gen: 1 crédito
 * - Enhance: 1 crédito
 * - Color Match: 1 crédito
 *
 * TODAS as operações usam Gemini 2.5 Flash Image:
 * - Custo: $0.039 USD/imagem (~R$ 0,195 com dólar a R$ 5,00)
 * - Free Tier: 500 requisições/dia (Google AI Studio)
 * - Produção: Vertex AI (sem free tier)
 *
 * MULTI-USUÁRIOS:
 * - Studio/Enterprise podem ter organizações
 * - Organizações compartilham limites entre membros
 * - Sistema verifica organização primeiro, depois usuário individual
 */

export type OperationType = 'topographic' | 'lines' | 'ia_gen' | 'enhance' | 'color_match';
export type PlanType = 'free' | 'starter' | 'pro' | 'studio' | 'enterprise';

// Custo em créditos por operação (SIMPLIFICADO - tudo 1 crédito)
export const CREDITS_COST: Record<OperationType, number> = {
  topographic: 1,
  lines: 1,
  ia_gen: 1,
  enhance: 1,
  color_match: 1,
};

// Custo real em USD (Gemini 2.5 Flash Image - Dezembro 2025)
// Fonte: https://ai.google.dev/gemini-api/docs/pricing
export const USD_COST: Record<OperationType, number> = {
  topographic: 0.039,    // Gemini 2.5 Flash Image
  lines: 0.039,          // Gemini 2.5 Flash Image
  ia_gen: 0.039,         // Gemini 2.5 Flash Image
  enhance: 0.039,        // Gemini 2.5 Flash Image (4K upscale)
  color_match: 0.02,     // Apenas análise de texto (input)
};

// Custo em BRL (dólar a R$ 5,00)
export const BRL_COST: Record<OperationType, number> = {
  topographic: 0.195,
  lines: 0.195,
  ia_gen: 0.195,
  enhance: 0.195,
  color_match: 0.10,
};

// Limites DIÁRIOS por plano (para evitar abuso)
// IMPORTANTE: Plano free = 0 gerações!
export const DAILY_LIMITS: Record<PlanType, number> = {
  free: 0,         // Sem gerações
  starter: 20,     // 20 gerações/dia
  pro: 50,         // 50 gerações/dia
  studio: 200,     // 200 gerações/dia (ilimitado mensal)
  enterprise: -1   // Verdadeiramente ilimitado
};

// Limites mensais por plano (inclusos na assinatura)
export const PLAN_LIMITS: Record<PlanType, Record<OperationType, number | null>> = {
  free: {
    topographic: 0,      // ZERO gerações para free
    lines: 0,
    ia_gen: 0,
    enhance: 0,
    color_match: 0,
  },
  starter: {
    topographic: 100,    // 100 gerações/mês incluídas (Starter)
    lines: 100,
    ia_gen: 100,
    enhance: 100,
    color_match: 100,
  },
  pro: {
    topographic: 500,    // 500 gerações/mês incluídas
    lines: 500,
    ia_gen: 500,
    enhance: 500,
    color_match: 500,
  },
  studio: {
    topographic: null,   // Ilimitado
    lines: null,
    ia_gen: null,
    enhance: null,
    color_match: null,
  },
  enterprise: {
    topographic: null,   // Verdadeiramente ilimitado
    lines: null,
    ia_gen: null,
    enhance: null,
    color_match: null,
  }
};

// =====================================================
// MULTI-USER SUPPORT: Determinar source de créditos
// =====================================================

interface UsageSource {
  type: 'organization' | 'user';
  id: string;
  plan: PlanType;
  credits: number;
  usage_this_month: Record<string, number>;
  subscription_status?: string;
  subscription_expires_at?: string | null;
}

/**
 * Determina se deve usar organização ou usuário individual
 * Priority: Organization (active) > User (individual)
 */
async function getUsageSource(clerkId: string): Promise<UsageSource | null> {
  try {
    // 1. Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, plan, credits, usage_this_month, subscription_status, subscription_expires_at')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      console.error('[getUsageSource] User not found:', clerkId);
      return null;
    }

    // 2. Verificar se usuário está em organização ativa
    const org = await getActiveOrganization(user.id);

    if (org) {
      // Usar organização (compartilhado)
      return {
        type: 'organization',
        id: org.id,
        plan: org.plan as PlanType,
        credits: org.credits || 0,
        usage_this_month: org.usage_this_month || {},
        subscription_status: org.subscription_status,
        subscription_expires_at: org.subscription_expires_at,
      };
    }

    // 3. Usar plano individual
    // Verificar se subscription expirou
    let effectivePlan = user.plan as PlanType;
    if (user.subscription_expires_at) {
      const isExpired = new Date(user.subscription_expires_at) < new Date();
      if (isExpired) {
        effectivePlan = 'free';
      }
    }

    return {
      type: 'user',
      id: user.id,
      plan: effectivePlan,
      credits: user.credits || 0,
      usage_this_month: user.usage_this_month || {},
      subscription_status: user.subscription_status,
      subscription_expires_at: user.subscription_expires_at,
    };
  } catch (error) {
    console.error('[getUsageSource] Fatal error:', error);
    return null;
  }
}

/**
 * Verifica se usuário tem créditos/limites suficientes
 * ATUALIZADO: Suporta organizations
 */
export async function canUseOperation(
  userId: string,
  operation: OperationType
): Promise<{ allowed: boolean; reason?: string; source?: 'organization' | 'user' }> {
  // Usar novo sistema de usage source
  const source = await getUsageSource(userId);

  if (!source) {
    return { allowed: false, reason: 'Usuário não encontrado' };
  }

  // Validar plano com fallback seguro
  let plan = source.plan;
  if (!plan || !['free', 'starter', 'pro', 'studio', 'enterprise'].includes(plan)) {
    plan = 'free';
  }

  // Enterprise e Studio = ilimitado
  if (plan === 'enterprise' || plan === 'studio') {
    console.log(`[Credits] Plano ilimitado (${source.type}): ${plan}`);
    return { allowed: true, source: source.type };
  }

  const credits = source.credits || 0;
  const usage = source.usage_this_month as Record<OperationType, number>;

  // Verificar limite mensal do plano
  const planLimits = PLAN_LIMITS[plan];
  if (!planLimits) {
    console.error(`Plan limits não encontrado para: ${plan}`);
    return { allowed: false, reason: 'Erro de configuração de plano' };
  }

  const limit = planLimits[operation];
  const currentUsage = usage[operation] || 0;

  if (limit !== null && currentUsage >= limit) {
    // Atingiu limite do plano, verificar créditos avulsos
    const creditsNeeded = CREDITS_COST[operation];

    if (credits >= creditsNeeded) {
      return { allowed: true, source: source.type }; // Vai usar créditos avulsos
    }

    return {
      allowed: false,
      reason: `Limite mensal atingido (${limit}). Compre créditos ou faça upgrade.`,
      source: source.type,
    };
  }

  // Dentro do limite do plano
  return { allowed: true, source: source.type };
}

/**
 * Consome créditos/limite ao realizar operação
 * ATUALIZADO: Suporta organizations
 */
export async function consumeOperation(
  userId: string,
  operation: OperationType
): Promise<{ success: boolean; error?: string }> {
  // Usar novo sistema de usage source
  const source = await getUsageSource(userId);

  if (!source) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  // Validar plano
  let plan = source.plan;
  if (!plan || !['free', 'starter', 'pro', 'studio', 'enterprise'].includes(plan)) {
    plan = 'free';
  }

  const credits = source.credits || 0;
  const usage = source.usage_this_month as Record<OperationType, number>;
  const currentUsage = usage[operation] || 0;

  const planLimits = PLAN_LIMITS[plan];
  if (!planLimits) {
    console.error(`Plan limits não encontrado para: ${plan}`);
    return { success: false, error: 'Erro de configuração de plano' };
  }

  const limit = planLimits[operation];

  let newCredits = credits;
  let newUsage = { ...usage };
  let usedCredits = 0;

  // Enterprise/Studio = ilimitado, apenas registra uso
  if (plan === 'enterprise' || plan === 'studio') {
    newUsage[operation] = currentUsage + 1;
  }
  // Dentro do limite do plano
  else if (limit === null || currentUsage < limit) {
    newUsage[operation] = currentUsage + 1;
  }
  // Fora do limite, usa créditos avulsos
  else {
    const creditsNeeded = CREDITS_COST[operation];
    if (credits < creditsNeeded) {
      return { success: false, error: 'Créditos insuficientes' };
    }
    newCredits -= creditsNeeded;
    usedCredits = creditsNeeded;
  }

  // Atualizar banco (organization ou user)
  if (source.type === 'organization') {
    // Atualizar organização
    const updateSuccess = await incrementOrganizationUsage(source.id, operation);
    if (!updateSuccess) {
      return { success: false, error: 'Erro ao atualizar uso da organização' };
    }

    // Deduzir créditos se necessário
    if (usedCredits > 0) {
      const creditSuccess = await decrementOrganizationCredits(source.id);
      if (!creditSuccess) {
        return { success: false, error: 'Créditos insuficientes' };
      }
    }

    // Log com organization_id
    await supabaseAdmin.from('usage_logs').insert({
      user_id: userId,
      organization_id: source.id,
      source_type: 'organization',
      operation_type: operation,
      credits_used: usedCredits,
      cost_usd: USD_COST[operation],
      metadata: { plan, limit, current_usage: currentUsage },
    });
  } else {
    // Atualizar usuário individual
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        credits: newCredits,
        usage_this_month: newUsage,
      })
      .eq('id', source.id);

    if (updateError) {
      return { success: false, error: 'Erro ao atualizar créditos' };
    }

    // Log sem organization_id
    await supabaseAdmin.from('usage_logs').insert({
      user_id: userId,
      source_type: 'user',
      operation_type: operation,
      credits_used: usedCredits,
      cost_usd: USD_COST[operation],
      metadata: { plan, limit, current_usage: currentUsage },
    });
  }

  console.log(`[consumeOperation] ✅ ${operation} consumed (${source.type}): ${userId}`);
  return { success: true };
}

/**
 * Adiciona créditos (compra)
 */
export async function addCredits(
  userId: string,
  amount: number,
  stripePaymentId?: string
): Promise<{ success: boolean }> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('clerk_id', userId)
    .single();

  const currentCredits = user?.credits || 0;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ credits: currentCredits + amount })
    .eq('clerk_id', userId);

  if (!error) {
    // Registrar transação
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: userId,
      amount,
      type: 'purchase',
      stripe_payment_id: stripePaymentId,
    });
  }

  return { success: !error };
}

/**
 * Reseta limites mensais (executar todo dia 1 via cron)
 * ATUALIZADO: Reseta também organizações
 */
export async function resetMonthlyLimits(): Promise<void> {
  // Resetar usuários individuais
  await supabaseAdmin
    .from('users')
    .update({ usage_this_month: {} })
    .in('plan', ['starter', 'pro']); // Studio/Enterprise não resetam (ilimitado)

  // Resetar organizações (se tivessem limites, mas Studio/Enterprise são ilimitados)
  // Mantém por consistência
  await supabaseAdmin
    .from('organizations')
    .update({ usage_this_month: {} })
    .in('plan', ['studio', 'enterprise']);

  console.log('[resetMonthlyLimits] ✅ Monthly limits reset');
}

/**
 * Obtém estatísticas de uso do usuário
 */
export async function getUserUsageStats(userId: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan, credits, usage_this_month')
    .eq('clerk_id', userId)
    .single();

  if (!user) return null;

  // Validar plano com fallback seguro
  let plan = user.plan as PlanType;
  if (!plan || !['free', 'starter', 'pro', 'studio'].includes(plan)) {
    plan = 'free';
  }

  const usage = (user.usage_this_month || {}) as Record<OperationType, number>;
  const limits = PLAN_LIMITS[plan];

  if (!limits) {
    console.error(`Plan limits não encontrado para: ${plan}`);
    return null;
  }

  return {
    plan,
    credits: user.credits || 0,
    usage: {
      topographic: {
        used: usage.topographic || 0,
        limit: limits.topographic,
        percentage: limits.topographic
          ? Math.round(((usage.topographic || 0) / limits.topographic) * 100)
          : 0,
      },
      lines: {
        used: usage.lines || 0,
        limit: limits.lines,
        percentage: limits.lines
          ? Math.round(((usage.lines || 0) / limits.lines) * 100)
          : 0,
      },
      ia_gen: {
        used: usage.ia_gen || 0,
        limit: limits.ia_gen,
        percentage: limits.ia_gen
          ? Math.round(((usage.ia_gen || 0) / limits.ia_gen) * 100)
          : 0,
      },
      enhance: {
        used: usage.enhance || 0,
        limit: limits.enhance,
        percentage: limits.enhance
          ? Math.round(((usage.enhance || 0) / limits.enhance) * 100)
          : 0,
      },
      color_match: {
        used: usage.color_match || 0,
        limit: limits.color_match,
        percentage: limits.color_match
          ? Math.round(((usage.color_match || 0) / limits.color_match) * 100)
          : 0,
      },
    },
  };
}
