/**
 * API Route: Confirm Subscription
 * Confirma pagamento e cria subscription no Stripe após Payment Intent bem-sucedido
 * 
 * ATUALIZADO: Dezembro 2025
 * - Novos planos: starter, pro, studio
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID não fornecido' }, { status: 400 });
    }

    // Buscar Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Pagamento não foi concluído', status: paymentIntent.status },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Extrair metadata
    const { price_id, plan, customer: customerId } = paymentIntent.metadata;
    const stripeCustomerId = paymentIntent.customer as string;

    if (!price_id || !plan) {
      return NextResponse.json({ error: 'Metadata incompleta no Payment Intent' }, { status: 400 });
    }

    // Criar subscription no Stripe
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        clerk_id: userId,
        user_id: user.id,
        plan: plan,
      },
    });

    console.log(`[Confirm Subscription] Subscription criada: ${subscription.id} para plano ${plan}`);

    // Atualizar usuário no banco
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        is_paid: true,
        plan: plan as 'starter' | 'pro' | 'studio',
        tools_unlocked: plan === 'pro' || plan === 'studio',
      })
      .eq('id', user.id);

    // Invalidar cache do usuário após atualização
    await invalidateCache(userId, 'users');
    console.log(`[Confirm Subscription] Cache invalidado para userId: ${userId}`);

    // Buscar customer do banco
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    // Registrar subscription no banco
    await supabaseAdmin.from('subscriptions').insert({
      customer_id: customer?.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price_id,
      stripe_product_id:
        typeof subscription.items.data[0].price.product === 'string'
          ? subscription.items.data[0].price.product
          : subscription.items.data[0].price.product.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      metadata: subscription.metadata,
    });

    // Definir descrição do pagamento
    let planDescription: string;
    switch (plan) {
      case 'studio':
        planDescription = 'Studio';
        break;
      case 'pro':
        planDescription = 'Pro';
        break;
      default:
        planDescription = 'Starter';
    }

    // Registrar pagamento
    await supabaseAdmin.from('payments').insert({
      user_id: user.id,
      customer_id: customer?.id,
      stripe_payment_id: paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_subscription_id: subscription.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'succeeded',
      payment_method: 'card',
      description: `Assinatura ${planDescription}`,
      plan_type: plan,
    });

    console.log(`[Confirm Subscription] Usuário ${user.email} ativado com plano ${plan}`);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (error: any) {
    console.error('[Confirm Subscription] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao confirmar subscription: ' + error.message },
      { status: 500 }
    );
  }
}
