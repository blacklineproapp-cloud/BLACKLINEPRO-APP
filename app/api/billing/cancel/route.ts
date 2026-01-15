import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SubscriptionService } from '@/lib/stripe/subscription-service';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { reason, feedback } = await req.json();

    if (!reason) {
      return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 });
    }

    // 1. Buscar usuário para pegar o customer_id
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, stripe_customer_id') // Precisamos do UUID interno e do Stripe ID
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 2. Buscar assinatura ativa
    // O service busca pelo UUID interno se a tabela customers usar UUID referenciado, 
    // mas o método getByCustomerId espera o UUID da tabela customers.
    // Vamos simplificar: buscar subscription ativa do usuário
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*, customers!inner(*)') // Join manual se necessário, mas vamos tentar direto pelo stripe_subscription_id se possível? Não temos.
      .eq('customers.user_id', user.id) // Buscar via customer associado
      .in('status', ['active', 'trialing'])
      .single();

    // Alternativa mais segura: Usar SubscriptionService.getByCustomerId se ele aceitar o ID da tabela customers
    // Para isso precisariamos buscar o customer.id primeiro.
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (!customer) {
       return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const activeSub = await SubscriptionService.getByCustomerId(customer.id);

    if (!activeSub || !activeSub.stripe_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 400 });
    }

    // 3. Cancelar no Stripe (Cancel at period end)
    await SubscriptionService.cancelSubscription(activeSub.stripe_subscription_id, true);

    // 4. Registrar motivo do cancelamento
    const { error: logError } = await supabaseAdmin
      .from('subscription_cancellations')
      .insert({
        user_id: user.id, // UUID do usuário
        reason,
        feedback: feedback || '',
      });

    if (logError) {
      logger.error('Erro ao salvar motivo do cancelamento', logError);
      // Não falhar a request se o Log falhar, o cancelamento já ocorreu
    }

    return NextResponse.json({ success: true, message: 'Assinatura cancelada com sucesso' });

  } catch (error: any) {
    logger.error('Erro ao cancelar assinatura:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao cancelar assinatura' },
      { status: 500 }
    );
  }
}
