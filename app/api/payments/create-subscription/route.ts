/**
 * API Route: Create Subscription with Payment Intent
 * Cria uma assinatura Stripe usando Payment Intent (in-app checkout)
 * 
 * ATUALIZADO: Dezembro 2025
 * - Novos planos: starter, pro, studio
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe, PRICES } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { CustomerService } from '@/lib/stripe';
import { getPriceIdFromPlan } from '@/lib/billing/stripe-plan-mapping';
import type { BillingCycle } from '@/lib/stripe/types';

type CheckoutPlan = 'starter' | 'pro' | 'studio' | 'enterprise';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !clerkUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { plan, cycle = 'monthly' } = await req.json();

    // Validar plano
    if (plan !== 'starter' && plan !== 'pro' && plan !== 'studio' && plan !== 'enterprise') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Validar ciclo de pagamento
    const validCycles: BillingCycle[] = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!validCycles.includes(cycle as BillingCycle)) {
      return NextResponse.json({ error: 'Ciclo de pagamento inválido' }, { status: 400 });
    }

    const user = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se Stripe está configurado
    const isStripeConfigured =
      PRICES.STARTER &&
      PRICES.PRO &&
      PRICES.STARTER.startsWith('price_') &&
      PRICES.STARTER.length > 20;

    // Em desenvolvimento, ativar direto sem Stripe
    if (!isStripeConfigured && process.env.NODE_ENV !== 'production') {
      const updates: any = {
        is_paid: true,
        subscription_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        plan: plan,
      };

      if (plan === 'pro' || plan === 'studio') {
        updates.tools_unlocked = true;
      }

      await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('clerk_id', userId);

      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Plano ativado (modo desenvolvimento)',
      });
    }

    if (!isStripeConfigured) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    // Definir price ID baseado no plano e ciclo
    let priceId: string;
    let amount: number;

    try {
      priceId = getPriceIdFromPlan(plan, cycle as BillingCycle);

      // Calcular valor baseado no plano e ciclo
      switch (plan) {
        case 'starter':
          amount = cycle === 'monthly' ? 5000 :
                   cycle === 'quarterly' ? 13500 :
                   cycle === 'semiannual' ? 22500 :
                   36000; // yearly
          break;
        case 'pro':
          amount = cycle === 'monthly' ? 10000 :
                   cycle === 'quarterly' ? 27000 :
                   cycle === 'semiannual' ? 45000 :
                   72000; // yearly
          break;
        case 'studio':
          amount = cycle === 'monthly' ? 30000 :
                   cycle === 'quarterly' ? 81000 :
                   cycle === 'semiannual' ? 135000 :
                   216000; // yearly
          break;
        default:
          priceId = PRICES.STARTER;
          amount = 5000;
      }
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Buscar ou criar customer no Stripe
    let stripeCustomerId: string;
    const existingCustomer = await CustomerService.getByUserId(user.id);

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;

      // 🔒 VERIFICAÇÃO: Checar se customer existe e não foi deletado
      const customer = await stripe.customers.retrieve(stripeCustomerId);

      if ('deleted' in customer && customer.deleted) {
        return NextResponse.json({
          error: 'Customer foi deletado no Stripe. Entre em contato com suporte.'
        }, { status: 400 });
      }

      // ℹ️ Verificar se tem payment method (cartão) para cobranças automáticas
      const hasDefaultPaymentMethod = customer.invoice_settings?.default_payment_method ||
                                     customer.default_source;

      if (!hasDefaultPaymentMethod) {
        console.warn(`[Create Subscription] ⚠️ Customer ${stripeCustomerId} sem cartão cadastrado - precisará pagar boleto todo mês`);
      } else {
        console.log(`[Create Subscription] ✅ Customer ${stripeCustomerId} tem cartão configurado para cobrança automática`);
      }
    } else {
      // Criar customer no Stripe
      const customer = await stripe.customers.create({
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: user.name,
        metadata: {
          clerk_id: userId,
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Salvar customer no banco
      await supabaseAdmin.from('customers').insert({
        user_id: user.id,
        stripe_customer_id: customer.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        nome: user.name,
      });
    }

    // Criar Payment Intent com subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      customer: stripeCustomerId,
      payment_method_types: ['card', 'boleto'], // ✅ Boleto e cartão disponíveis
      setup_future_usage: 'off_session', // Para cobranças recorrentes automáticas
      metadata: {
        clerk_id: userId,
        user_id: user.id,
        plan: plan,
        cycle: cycle,
        price_id: priceId,
      },
    });

    console.log(`[Create Subscription] Payment Intent criado: ${paymentIntent.id} para ${plan} (${cycle})`);

    // Retornar client secret para o frontend
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerId: stripeCustomerId,
      priceId: priceId,
      plan: plan,
      cycle: cycle,
    });
  } catch (error: any) {
    console.error('[Create Subscription] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pagamento: ' + error.message },
      { status: 500 }
    );
  }
}
