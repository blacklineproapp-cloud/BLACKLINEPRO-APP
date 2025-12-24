import { supabaseAdmin } from './supabase';

/**
 * Sistema de Créditos StencilFlow
 *
 * ATUALIZADO: Dezembro 2025 - Custos REAIS da API Gemini 2.5 Flash Image
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
 */

export type OperationType = 'topographic' | 'lines' | 'ia_gen' | 'enhance' | 'color_match';
export type PlanType = 'starter' | 'pro' | 'studio';

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
// IMPORTANTE: NÃO existe plano gratuito!
export const DAILY_LIMITS: Record<PlanType, number> = {
  starter: 20,   // 20 gerações/dia
  pro: 50,       // 50 gerações/dia
  studio: 200,   // 200 gerações/dia (ilimitado mensal)
};

// Limites mensais por plano (inclusos na assinatura)
export const PLAN_LIMITS: Record<PlanType, Record<OperationType, number | null>> = {
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
};

/**
 * Verifica se usuário tem créditos/limites suficientes
 */
export async function canUseOperation(
  userId: string,
  operation: OperationType
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('plan, credits, usage_this_month')
    .eq('clerk_id', userId)
    .single();

  if (error || !user) {
    return { allowed: false, reason: 'Usuário não encontrado' };
  }

  // Validar plano com fallback seguro
  let plan = user.plan as PlanType;
  if (!plan || !['starter', 'pro', 'studio'].includes(plan)) {
    plan = 'starter'; // Default seguro

    // Atualizar no banco para evitar erro futuro
    await supabaseAdmin
      .from('users')
      .update({ plan: 'starter' })
      .eq('clerk_id', userId);
  }

  const credits = user.credits || 0;
  const usage = (user.usage_this_month || {}) as Record<OperationType, number>;

  // Studio = ilimitado
  if (plan === 'studio') {
    return { allowed: true };
  }

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
      return { allowed: true }; // Vai usar créditos avulsos
    }

    return {
      allowed: false,
      reason: `Limite mensal atingido (${limit}). Compre créditos ou faça upgrade.`,
    };
  }

  // Dentro do limite do plano
  return { allowed: true };
}

/**
 * Consome créditos/limite ao realizar operação
 */
export async function consumeOperation(
  userId: string,
  operation: OperationType
): Promise<{ success: boolean; error?: string }> {
  const { data: user, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('plan, credits, usage_this_month')
    .eq('clerk_id', userId)
    .single();

  if (fetchError || !user) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  // Validar plano com fallback seguro
  let plan = user.plan as PlanType;
  if (!plan || !['starter', 'pro', 'studio'].includes(plan)) {
    plan = 'starter'; // Default seguro

    // Atualizar no banco
    await supabaseAdmin
      .from('users')
      .update({ plan: 'starter' })
      .eq('clerk_id', userId);
  }

  const credits = user.credits || 0;
  const usage = (user.usage_this_month || {}) as Record<OperationType, number>;
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

  // Studio = ilimitado, apenas registra uso
  if (plan === 'studio') {
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

  // Atualizar banco
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      credits: newCredits,
      usage_this_month: newUsage,
    })
    .eq('clerk_id', userId);

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar créditos' };
  }

  // Registrar log de uso
  await supabaseAdmin.from('usage_logs').insert({
    user_id: userId,
    operation_type: operation,
    credits_used: usedCredits,
    cost_usd: USD_COST[operation],
    metadata: { plan, limit, current_usage: currentUsage },
  });

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
 */
export async function resetMonthlyLimits(): Promise<void> {
  await supabaseAdmin
    .from('users')
    .update({ usage_this_month: {} })
    .in('plan', ['starter', 'pro']); // Studio não tem limites (ilimitado)
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
  if (!plan || !['starter', 'pro', 'studio'].includes(plan)) {
    plan = 'starter';
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
