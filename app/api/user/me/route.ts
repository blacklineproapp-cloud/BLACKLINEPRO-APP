export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log('[User API] Não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('[User API] Buscando dados para userId:', userId);

    // Usar getOrCreateUser para garantir que o usuário existe
    const user = await getOrCreateUser(userId);

    if (!user) {
      console.error('[User API] Usuário não encontrado após getOrCreateUser');
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('[User API] Usuário encontrado:', user.email);

    // Verificar se existe agendamento de cancelamento
    let scheduledToCancelAt = null;
    if (user.subscription_id) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('canceled_at, current_period_end')
        .eq('stripe_subscription_id', user.subscription_id)
        .single();
      
      // Se tiver canceled_at mas status ainda é ativo (verificado no frontend pelo user.subscription_status),
      // então é um cancelamento agendado.
      if (sub?.canceled_at) {
        scheduledToCancelAt = sub.current_period_end;
      }
    }

    // Retornar apenas os campos necessários
    return NextResponse.json({
      plan: user.plan || 'free',
      is_paid: user.is_paid || false,
      subscription_status: user.subscription_status || 'inactive',
      subscription_expires_at: user.subscription_expires_at || null,
      admin_courtesy: user.admin_courtesy || false,
      stripe_customer_id: user.stripe_customer_id || null, // Necessário para portal e boletos
      asaas_subscription_id: user.asaas_subscription_id || null, // Para cancelamento via Asaas
      asaas_customer_id: user.asaas_customer_id || null, // Para identificar usuários Asaas
      scheduled_to_cancel_at: scheduledToCancelAt
    });
  } catch (error: any) {
    console.error('[User API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do usuário: ' + error.message },
      { status: 500 }
    );
  }
}
