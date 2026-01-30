/**
 * Asaas Cancel Subscription API
 *
 * Cancela assinatura do usuário no Asaas
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasSubscriptionService } from '@/lib/asaas';

export async function POST(req: Request) {
  try {
    // 1. Autenticação
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, asaas_subscription_id, plan, subscription_status')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!user.asaas_subscription_id) {
      return NextResponse.json({
        error: 'Nenhuma assinatura ativa encontrada',
      }, { status: 400 });
    }

    // 3. Parse do request
    const body = await req.json().catch(() => ({}));
    const { reason, feedback } = body;

    // 4. Cancelar no Asaas
    console.log(`[Asaas Cancel] Cancelando assinatura ${user.asaas_subscription_id} para ${user.email}`);

    await AsaasSubscriptionService.cancel(user.asaas_subscription_id);

    // 5. Atualizar usuário no banco
    await supabaseAdmin.from('users').update({
      subscription_status: 'canceled',
      is_paid: false,
      tools_unlocked: false,
      plan: 'free',
      asaas_subscription_id: null,
    }).eq('id', user.id);

    // 6. Registrar cancelamento (ignora se tabela não existir)
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

    console.log(`[Asaas Cancel] ✅ Assinatura cancelada: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Assinatura cancelada com sucesso',
    });

  } catch (error: any) {
    console.error('[Asaas Cancel] Erro:', error);

    // Erro específico do Asaas
    if (error.name === 'AsaasApiError') {
      return NextResponse.json({
        error: error.message,
        code: error.code,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error.message || 'Erro ao cancelar assinatura',
    }, { status: 500 });
  }
}
