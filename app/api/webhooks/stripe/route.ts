/**
 * Stripe Webhooks Handler
 * Processa eventos do Stripe com logging completo e normalização de dados
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { CustomerService, SubscriptionService } from '@/lib/stripe';
import { getPlanFromPriceId } from '@/lib/billing';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return new NextResponse('Signature ausente', { status: 400 });
  }

  let event: Stripe.Event;

  // ========================================
  // 1. VERIFICAR ASSINATURA DO WEBHOOK
  // ========================================

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Erro ao verificar assinatura:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`\n🔔 [Webhook] Evento recebido: ${event.type} (${event.id})`);

  // ========================================
  // 2. REGISTRAR WEBHOOK NO LOG
  // ========================================

  let logId: string | null = null;

  try {
    const { data: log } = await supabaseAdmin
      .from('webhook_logs')
      .insert({
        event: event.type,
        stripe_event_id: event.id,
        payload: event as any,
        processed: false
      })
      .select()
      .single();

    logId = log?.id || null;
  } catch (logError: any) {
    // Se falhar ao registrar log, apenas avisar mas continuar processamento
    console.error('[Webhook] Erro ao registrar log:', logError.message);
  }

  // ========================================
  // 3. PROCESSAR EVENTO
  // ========================================

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Evento não tratado: ${event.type}`);
    }

    // Marcar log como processado
    if (logId) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', logId);
    }

    console.log(`✅ [Webhook] Processado com sucesso: ${event.type}\n`);
    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error(`❌ [Webhook] Erro ao processar ${event.type}:`, error);

    // Registrar erro no log
    if (logId) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({
          processed: false,
          error: error.message
        })
        .eq('id', logId);
    }

    // Retornar 200 mesmo com erro para não retrigar o webhook
    return new NextResponse('Error logged', { status: 200 });
  }
}

// ============================================================================
// HANDLERS DE EVENTOS
// ============================================================================

/**
 * checkout.session.completed
 * Quando checkout é finalizado com sucesso
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkId = session.client_reference_id || session.metadata?.clerk_id;
  const plan = session.metadata?.plan as 'starter' | 'pro' | 'studio' | undefined;

  if (!clerkId) {
    throw new Error('Checkout sem clerk_id');
  }

  console.log(`  → Checkout completado para: ${clerkId}, plan: ${plan}`);

  // 1. Buscar usuário
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) {
    throw new Error(`Usuário não encontrado: ${clerkId}`);
  }

  // 2. Criar/buscar customer
  let customer = await CustomerService.getByUserId(user.id);

  if (!customer && session.customer) {
    // Criar customer no banco vinculado ao Stripe
    const { data: newCustomer } = await supabaseAdmin
      .from('customers')
      .insert({
        user_id: user.id,
        stripe_customer_id: session.customer as string,
        email: user.email,
        nome: user.name
      })
      .select()
      .single();

    customer = newCustomer;
  }

  // 3. Se é assinatura, processar
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    // Atualizar usuário (compatibilidade com código legado)
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        is_paid: true,
        plan: plan || 'starter',
        tools_unlocked: plan === 'pro' || plan === 'studio'
      })
      .eq('id', user.id);

    console.log(`  ✅ Assinatura ativada: ${plan || 'starter'}`);

    // Registrar pagamento
    await supabaseAdmin.from('payments').insert({
      user_id: user.id,
      customer_id: customer?.id,
      stripe_payment_id: session.payment_intent as string,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_subscription_id: subscription.id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'brl',
      status: 'succeeded',
      payment_method: 'card',
      description: `Assinatura ${plan === 'studio' ? 'Studio' : plan === 'pro' ? 'Pro' : 'Starter'}`,
      plan_type: plan || 'starter'
    });

    // TODO: Enviar email de boas-vindas
    // await sendWelcomeEmail(user.email, user.name);
  }
}

/**
 * customer.subscription.created
 * Quando nova assinatura é criada
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`  → Nova assinatura: ${subscription.id}`);

  // Buscar customer
  const customer = await CustomerService.getByStripeId(subscription.customer as string);

  if (!customer) {
    throw new Error(`Customer não encontrado: ${subscription.customer}`);
  }

  // Determinar plano baseado no price_id
  const priceId = subscription.items.data[0].price.id;
  const planMapping = getPlanFromPriceId(priceId);
  const planType = planMapping?.tier || 'starter';

  // Criar subscription no banco
  await supabaseAdmin.from('subscriptions').insert({
    customer_id: customer.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    stripe_product_id: typeof subscription.items.data[0].price.product === 'string'
      ? subscription.items.data[0].price.product
      : subscription.items.data[0].price.product.id,
    status: subscription.status as any,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    metadata: subscription.metadata
  });

  // Atualizar usuário
  await supabaseAdmin
    .from('users')
    .update({
      plan: planType,
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      is_paid: true,
      tools_unlocked: planType === 'pro' || planType === 'studio'
    })
    .eq('id', customer.user_id);

  console.log(`  ✅ Subscription criada no banco`);

  // TODO: Enviar email de boas-vindas
  // await sendWelcomeEmail(customer.email, customer.nome);
}

/**
 * customer.subscription.updated
 * Quando assinatura é atualizada (mudança de plano, status, etc)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`  → Assinatura atualizada: ${subscription.id} (${subscription.status})`);

  // Sincronizar com banco
  await SubscriptionService.syncFromStripe(subscription.id);

  // Atualizar usuário (compatibilidade)
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: subscription.status,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      is_paid: ['active', 'trialing'].includes(subscription.status)
    })
    .eq('subscription_id', subscription.id);

  console.log(`  ✅ Assinatura atualizada`);
}

/**
 * customer.subscription.deleted
 * Quando assinatura é cancelada/deletada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`  → Assinatura deletada: ${subscription.id}`);

  // Buscar subscription no banco
  const sub = await SubscriptionService.getByStripeId(subscription.id);

  if (sub) {
    // Atualizar no banco
    await SubscriptionService.updateSubscription(sub.id, {
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      ended_at: new Date().toISOString()
    });
  }

  // Reverter usuário para plano free
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'canceled',
      is_paid: false,
      plan: 'free',
      tools_unlocked: false
    })
    .eq('subscription_id', subscription.id);

  console.log(`  ✅ Assinatura cancelada, usuário revertido para FREE`);

  // TODO: Enviar email de cancelamento
  // await sendCancellationEmail(customer.email, customer.nome);
}

/**
 * invoice.payment_succeeded
 * Quando pagamento de invoice é bem-sucedido (renovações)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    console.log(`  → Invoice sem subscription, ignorando`);
    return;
  }

  console.log(`  → Pagamento bem-sucedido: ${invoice.id}`);

  // Buscar subscription
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  // Buscar customer
  const customer = await CustomerService.getByStripeId(invoice.customer as string);

  if (!customer) {
    throw new Error(`Customer não encontrado: ${invoice.customer}`);
  }

  // Atualizar subscription no banco
  await SubscriptionService.syncFromStripe(subscription.id);

  // Atualizar usuário (compatibilidade)
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'active',
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      is_paid: true
    })
    .eq('subscription_id', subscription.id);

  // Registrar pagamento
  const planMapping = getPlanFromPriceId(subscription.items.data[0].price.id);

  await supabaseAdmin.from('payments').insert({
    user_id: customer.user_id,
    customer_id: customer.id,
    stripe_payment_id: invoice.payment_intent as string,
    stripe_payment_intent_id: invoice.payment_intent as string,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscription.id,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    status: 'succeeded',
    payment_method: invoice.payment_intent ? 'card' : 'other',
    receipt_url: invoice.hosted_invoice_url || undefined,
    invoice_url: invoice.invoice_pdf || undefined,
    description: `Renovação ${planMapping?.tier || 'subscription'}`,
    plan_type: planMapping?.tier || 'editor_only'
  });

  console.log(`  ✅ Pagamento registrado: R$ ${invoice.amount_paid / 100}`);

  // TODO: Enviar email de confirmação de pagamento
  // await sendPaymentConfirmationEmail(customer.email, customer.nome, invoice);
}

/**
 * invoice.payment_failed
 * Quando pagamento de invoice falha
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    console.log(`  → Invoice sem subscription, ignorando`);
    return;
  }

  console.log(`  ⚠️  Pagamento falhou: ${invoice.id}`);

  // Marcar como past_due
  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'past_due'
    })
    .eq('subscription_id', invoice.subscription as string);

  // Buscar customer
  const customer = await CustomerService.getByStripeId(invoice.customer as string);

  if (customer) {
    // Registrar tentativa de pagamento falhada
    await supabaseAdmin.from('payments').insert({
      user_id: customer.user_id,
      customer_id: customer.id,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription as string,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      description: `Falha no pagamento - ${invoice.id}`
    });
  }

  console.log(`  ✅ Status atualizado para past_due`);

  // TODO: Enviar email de falha no pagamento
  // await sendPaymentFailedEmail(customer.email, customer.nome, invoice);
}
