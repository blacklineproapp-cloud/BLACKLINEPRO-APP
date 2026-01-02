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

  // ========================================
  // 2. VERIFICAR IDEMPOTÊNCIA (prevenir duplicatas)
  // ========================================

  try {
    // Verificar se evento já foi processado
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('event_id', event.id)
      .single();

    if (existingEvent) {
      if (existingEvent.status === 'completed') {
        console.log(`[Webhook] ✅ Evento ${event.id} já processado. Ignorando.`);
        return new NextResponse('Event already processed', { status: 200 });
      }

      if (existingEvent.status === 'processing') {
        // Evento está sendo processado em paralelo (race condition)
        console.warn(`[Webhook] ⚠️ Evento ${event.id} já está em processamento.`);
        return new NextResponse('Event currently processing', { status: 200 });
      }

      // Status 'failed' - permitir retry incrementando contador
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'processing',
          retry_count: (existingEvent.retry_count || 0) + 1
        })
        .eq('event_id', event.id);
    } else {
      // Primeira vez processando este evento
      await supabaseAdmin
        .from('webhook_events')
        .insert({
          event_id: event.id,
          event_type: event.type,
          source: 'stripe',
          status: 'processing',
          payload: event as any
        });
    }
  } catch (idempotencyError: any) {
    console.error('[Webhook] Erro ao verificar idempotência:', idempotencyError.message);
    // Se falhar verificação de idempotência, retornar 500 para retry
    return new NextResponse('Idempotency check failed', { status: 500 });
  }

  // ========================================
  // 3. REGISTRAR WEBHOOK NO LOG (legado - manter para compatibilidade)
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

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      default:
    }

    // Marcar evento como completed (idempotência)
    await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('event_id', event.id);

    // Marcar log como processado (legado)
    if (logId) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', logId);
    }

    console.log(`[Webhook] ✅ Evento ${event.type} (${event.id}) processado com sucesso`);
    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error(`❌ [Webhook] Erro ao processar ${event.type}:`, error);

    // Marcar evento como failed (idempotência)
    await supabaseAdmin
      .from('webhook_events')
      .update({
        status: 'failed',
        error_message: JSON.stringify({
          message: error.message,
          stack: error.stack,
          type: error.type,
          code: error.code
        })
      })
      .eq('event_id', event.id);

    // Registrar erro no log (legado)
    if (logId) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({
          processed: false,
          error: JSON.stringify({
            message: error.message,
            stack: error.stack,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode
          })
        })
        .eq('id', logId);
    }

    // 🔒 SEGURANÇA: Retornar 500 para Stripe RETENTAR automaticamente
    // Stripe fará retry com exponential backoff (1h, 2h, 4h, etc.)
    // Isso garante que dados não sejam perdidos em caso de falha temporária
    return new NextResponse(
      `Webhook processing failed: ${error.message}`,
      { status: 500 }
    );
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
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as 'starter' | 'pro' | 'studio' | 'enterprise' | undefined;

  // Se é modo 'setup', processar adição de cartão
  if (session.mode === 'setup') {
    return await handlePaymentMethodSetup(session, userId);
  }

  if (!clerkId) {
    throw new Error('Checkout sem clerk_id');
  }

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

  // 3. Verificar se foi iniciado pelo admin
  const isAdminInitiated = session.metadata?.admin_initiated === 'true';
  const adminId = session.metadata?.admin_id;

  // 4. Se é assinatura, processar
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    // Preparar updates
    const userUpdates: any = {
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      is_paid: true,
      plan: plan || 'starter',
      tools_unlocked: plan === 'pro' || plan === 'studio' || plan === 'enterprise'
    };

    // Se foi iniciado pelo admin, remover flag de cortesia
    if (isAdminInitiated) {
      userUpdates.admin_courtesy = false;
      userUpdates.admin_courtesy_granted_by = null;
      userUpdates.admin_courtesy_granted_at = null;
    }

    // Atualizar usuário
    await supabaseAdmin
      .from('users')
      .update(userUpdates)
      .eq('id', user.id);

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

    // Log se foi iniciado pelo admin
    if (isAdminInitiated && adminId) {
      await supabaseAdmin.from('admin_logs').insert({
        admin_user_id: adminId,
        action: 'user_completed_payment',
        target_user_id: user.id,
        details: { plan: plan || 'starter', subscription_id: subscription.id }
      });
    }

    // TODO: Enviar email de boas-vindas
    // await sendWelcomeEmail(user.email, user.name);
  }
}

/**
 * customer.subscription.created
 * Quando nova assinatura é criada
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {

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
      tools_unlocked: planType === 'pro' || planType === 'studio' || planType === 'enterprise'
    })
    .eq('id', customer.user_id);

  // TODO: Enviar email de boas-vindas
  // await sendWelcomeEmail(customer.email, customer.nome);
}

/**
 * customer.subscription.updated
 * Quando assinatura é atualizada (mudança de plano, status, etc)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {

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

}

/**
 * customer.subscription.deleted
 * Quando assinatura é cancelada/deletada
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {

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

  // TODO: Enviar email de cancelamento
  // await sendCancellationEmail(customer.email, customer.nome);
}

/**
 * invoice.payment_succeeded
 * Quando pagamento de invoice é bem-sucedido (renovações)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return;
  }

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

  // TODO: Enviar email de confirmação de pagamento
  // await sendPaymentConfirmationEmail(customer.email, customer.nome, invoice);
}

/**
 * invoice.payment_failed
 * Quando pagamento de invoice falha
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return;
  }

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

  // TODO: Enviar email de falha no pagamento
  // await sendPaymentFailedEmail(customer.email, customer.nome, invoice);
}

/**
 * setup_intent.succeeded
 * Quando usuário adiciona cartão com sucesso via Stripe Elements
 */
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {

  if (!setupIntent.customer || !setupIntent.payment_method) {
    throw new Error('Setup Intent sem customer ou payment_method');
  }

  try {
    const paymentMethodId = setupIntent.payment_method as string;

    // 1. Definir como método de pagamento padrão do customer
    await stripe.customers.update(setupIntent.customer as string, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // 2. Buscar customer no banco
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('user_id, email')
      .eq('stripe_customer_id', setupIntent.customer as string)
      .single();

    if (!customer) {
      return;
    }

    // 3. Atualizar metadata do usuário
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('metadata')
      .eq('id', customer.user_id)
      .single();

    const currentMetadata = currentUser?.metadata || {};

    await supabaseAdmin
      .from('users')
      .update({
        metadata: {
          ...currentMetadata,
          payment_method_added: true,
          payment_method_added_at: new Date().toISOString(),
          payment_method_id: paymentMethodId
        }
      })
      .eq('id', customer.user_id);

    // TODO: Enviar email de confirmação
    // await sendPaymentMethodAddedEmail(customer.email);

  } catch (error: any) {
    console.error(`  ❌ Erro ao processar setup intent:`, error);
    throw error;
  }
}

/**
 * Processar adição de método de pagamento (modo setup)
 * Quando usuário adiciona cartão via Checkout Session mode='setup'
 */
async function handlePaymentMethodSetup(session: Stripe.Checkout.Session, userId?: string) {

  if (!session.customer || !session.setup_intent) {
    throw new Error('Setup Session sem customer ou setup_intent');
  }

  try {
    // 1. Buscar SetupIntent para pegar o payment method
    const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string);

    if (!setupIntent.payment_method) {
      throw new Error('Setup Intent sem payment method');
    }

    const paymentMethodId = setupIntent.payment_method as string;

    // 2. Definir como método de pagamento padrão do customer
    await stripe.customers.update(session.customer as string, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // 3. Se temos userId, atualizar informação no banco
    if (userId) {
      await supabaseAdmin
        .from('users')
        .update({
          metadata: {
            payment_method_added: true,
            payment_method_added_at: new Date().toISOString()
          }
        })
        .eq('id', userId);

    }

    // 4. Buscar customer no banco
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('user_id, email')
      .eq('stripe_customer_id', session.customer as string)
      .single();

    if (customer) {
      // TODO: Enviar email de confirmação
      // await sendPaymentMethodAddedEmail(customer.email);
    }

  } catch (error: any) {
    console.error(`  ❌ Erro ao processar setup de pagamento:`, error);
    throw error;
  }
}
