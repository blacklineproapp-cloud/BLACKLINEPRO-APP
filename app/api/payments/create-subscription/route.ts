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

type CheckoutPlan = 'starter' | 'pro' | 'studio';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !clerkUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { plan } = await req.json();

    // Validar plano
    if (plan !== 'starter' && plan !== 'pro' && plan !== 'studio') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
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

    // Definir price ID e valor baseado no plano
    let priceId: string;
    let amount: number;
    
    switch (plan) {
      case 'starter':
        priceId = PRICES.STARTER;
        amount = 5000; // R$ 50 em centavos
        break;
      case 'pro':
        priceId = PRICES.PRO;
        amount = 10000; // R$ 100 em centavos
        break;
      case 'studio':
        priceId = PRICES.STUDIO;
        amount = 30000; // R$ 300 em centavos
        break;
      default:
        priceId = PRICES.STARTER;
        amount = 5000;
    }

    // Buscar ou criar customer no Stripe
    let stripeCustomerId: string;
    const existingCustomer = await CustomerService.getByUserId(user.id);

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
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
      payment_method_types: ['card'],
      setup_future_usage: 'off_session', // Para cobranças recorrentes
      metadata: {
        clerk_id: userId,
        user_id: user.id,
        plan: plan,
        price_id: priceId,
      },
    });

    console.log(`[Create Subscription] Payment Intent criado: ${paymentIntent.id} para ${plan}`);

    // Retornar client secret para o frontend
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerId: stripeCustomerId,
      priceId: priceId,
      plan: plan,
    });
  } catch (error: any) {
    console.error('[Create Subscription] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pagamento: ' + error.message },
      { status: 500 }
    );
  }
}
