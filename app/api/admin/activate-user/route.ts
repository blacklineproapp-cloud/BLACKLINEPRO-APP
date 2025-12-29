import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';

import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { getPriceIdFromPlan } from '@/lib/billing/stripe-plan-mapping';
import type { BillingCycle } from '@/lib/stripe/types';


/**
 * POST - Ativar usuário COM subscription no Stripe
 * Body: {
 *   userId: string,
 *   plan?: 'starter' | 'pro' | 'studio',
 *   cycle?: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
 * }
 *
 * IMPORTANTE: Agora cria subscription real no Stripe para cobranças automáticas
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      userId: userIdToActivate,
      plan: targetPlan = 'pro',
      cycle = 'monthly'
    } = body;

    if (!userIdToActivate) {
      return NextResponse.json(
        { error: 'Forneça o userId no body' },
        { status: 400 }
      );
    }

    // Validar plano
    if (!['starter', 'pro', 'studio'].includes(targetPlan)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      );
    }

    // Validar ciclo
    const validCycles: BillingCycle[] = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!validCycles.includes(cycle as BillingCycle)) {
      return NextResponse.json(
        { error: 'Ciclo de pagamento inválido' },
        { status: 400 }
      );
    }

    console.log('[Activate] Ativando usuário:', userIdToActivate, 'plano:', targetPlan, 'ciclo:', cycle);

    // Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userIdToActivate)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    let stripeSubscriptionId: string | null = null;

    try {
      // 1. Buscar ou criar customer no Stripe
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('stripe_customer_id')
        .eq('user_id', userIdToActivate)
        .single();

      let stripeCustomerId: string;

      if (existingCustomer?.stripe_customer_id) {
        stripeCustomerId = existingCustomer.stripe_customer_id;
        console.log('[Activate] Customer já existe:', stripeCustomerId);
      } else {
        // Criar customer no Stripe
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            clerk_id: user.clerk_id,
            user_id: userIdToActivate
          }
        });

        stripeCustomerId = customer.id;

        // Salvar customer no banco
        await supabaseAdmin.from('customers').insert({
          user_id: userIdToActivate,
          stripe_customer_id: customer.id,
          email: user.email,
          nome: user.name
        });

        console.log('[Activate] Customer criado:', customer.id);
      }

      // 2. Obter Price ID do Stripe
      const priceId = getPriceIdFromPlan(targetPlan, cycle as BillingCycle);

      // 3. Criar subscription no Stripe (sem trial, início imediato)
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        metadata: {
          clerk_id: user.clerk_id,
          user_id: userIdToActivate,
          plan: targetPlan,
          cycle: cycle,
          manual_activation: 'true'
        }
      });

      stripeSubscriptionId = subscription.id;

      // 4. Registrar subscription no banco
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      await supabaseAdmin.from('subscriptions').insert({
        customer_id: customer?.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        stripe_product_id: typeof subscription.items.data[0].price.product === 'string'
          ? subscription.items.data[0].price.product
          : subscription.items.data[0].price.product.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: subscription.metadata
      });

      console.log('[Activate] Subscription criada:', subscription.id);
    } catch (stripeError: any) {
      console.error('[Activate] Erro ao criar subscription:', stripeError);
      return NextResponse.json(
        { error: 'Erro ao criar subscription no Stripe: ' + stripeError.message },
        { status: 500 }
      );
    }

    // 5. Ativar usuário com subscription
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        is_paid: true,
        subscription_status: 'active',
        subscription_id: stripeSubscriptionId,
        tools_unlocked: targetPlan === 'pro' || targetPlan === 'studio',
        plan: targetPlan
      })
      .eq('id', userIdToActivate)
      .select('email, is_paid, tools_unlocked, subscription_status, plan, subscription_id')
      .single();

    if (error) {
      console.error('[Activate] Erro:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Activate] ✅ Usuário ativado com subscription:', data.email);

    return NextResponse.json({
      success: true,
      message: 'Usuário ativado com subscription no Stripe',
      user: {
        id: userIdToActivate,
        email: data.email,
        is_paid: data.is_paid,
        tools_unlocked: data.tools_unlocked,
        subscription_status: data.subscription_status,
        plan: data.plan,
        subscription_id: data.subscription_id
      }
    });

  } catch (error: any) {
    console.error('[Activate] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
