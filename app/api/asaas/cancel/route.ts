/**
 * Asaas Cancel Subscription API
 *
 * Cancela assinatura do usuário no Asaas
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasSubscriptionService } from '@/lib/asaas';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export const POST = withAuth(async (req, { userId, user }) => {
  if (!user.asaas_subscription_id) {
    return NextResponse.json({
      error: 'Nenhuma assinatura ativa encontrada',
    }, { status: 400 });
  }

  // Parse do request
  const body = await req.json().catch(() => ({}));
  const { reason, feedback } = body;

  // Cancelar no Asaas
  logger.info('[Asaas] Cancelando assinatura', { subscriptionId: user.asaas_subscription_id });

  await AsaasSubscriptionService.cancel(user.asaas_subscription_id);

  // Atualizar usuário no banco
  await supabaseAdmin.from('users').update({
    subscription_status: 'canceled',
    is_paid: false,
    tools_unlocked: false,
    plan: 'free',
    asaas_subscription_id: null,
  }).eq('id', user.id);

  // Registrar cancelamento (ignora se tabela não existir)
  try {
    await supabaseAdmin.from('subscription_cancellations').insert({
      user_id: user.id,
      email: user.email,
      previous_plan: user.plan,
      reason: reason || 'Não informado',
      feedback: feedback || null,
      canceled_at: new Date().toISOString(),
      source: 'asaas',
    });
  } catch {
    // Tabela pode não existir
  }

  logger.info('[Asaas] Assinatura cancelada com sucesso', { userId: user.id });

  return NextResponse.json({
    success: true,
    message: 'Assinatura cancelada com sucesso',
  });
});
