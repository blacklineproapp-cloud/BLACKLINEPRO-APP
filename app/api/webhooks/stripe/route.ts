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
import { createOrganization } from '@/lib/organizations';
import { activateUserAtomic } from '@/lib/admin/user-activation';
import type { PlanType } from '@/lib/stripe/types';
import Stripe from 'stripe';

/**
 * Converte timestamp do Stripe (unix seconds) para ISO string de forma segura
 * Retorna null se o valor for null, undefined ou inválido
 */
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
    return null;
  }
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch (e) {
    console.error('[Webhook] Erro ao converter timestamp:', timestamp, e);
    return null;
  }
}

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

      case 'checkout.session.async_payment_succeeded':
        // 🔧 BOLETO PAGO: Usar handler dedicado que FORÇA isPaid=true
        await handleAsyncPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.async_payment_failed':
        // Log ou notificação de falha em pagamento assíncrono (Boleto não pago)
        console.warn(`[Webhook] ❌ Pagamento assíncrono falhou: ${event.id}`);
        break;

      case 'invoice.created':
        // 🎫 BOLETO: Finalizar invoice para gerar boleto
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.finalized':
        // 🎫 BOLETO: Invoice finalizada, boleto está pronto
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
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

    console.log(`[Webhook Stripe] ✅ Evento ${event.type} (${event.id}) processado com sucesso`);
    return new NextResponse('OK', { status: 200 });

  } catch (error: any) {
    console.error(`❌ [Webhook Stripe] Erro ao processar ${event.type}:`, error);

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
    .select('id, email, name, is_blocked')
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
      const isPaid = session.payment_status === 'paid';

      // 🔍 LOG CRÍTICO: Verificar se Stripe está enviando status correto (BOLETOS)
      console.log(`[Webhook] Checkout ${session.id}:`);
      console.log(`  - payment_status: "${session.payment_status}"`);
      console.log(`  - isPaid: ${isPaid}`);
      console.log(`  - payment_method_types: ${JSON.stringify(session.payment_method_types)}`);

      if (!isPaid && session.payment_method_types?.includes('boleto')) {
        console.warn(`[Webhook] ⚠️ BOLETO com status="${session.payment_status}" - Pode estar pendente ou Stripe não atualizou ainda`);
      }

      // Preparar updates do usuário
      const userUpdates: any = {
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        plan: plan || 'starter',
        // SÓ libera se estiver pago. Se for boleto pendente (unpaid), is_paid continua false ou status anterior.
        is_paid: isPaid,
        tools_unlocked: isPaid && (plan === 'pro' || plan === 'studio' || plan === 'enterprise')
      };

      // Se foi iniciado pelo admin e PAGOU, remover flag de cortesia
      if (isAdminInitiated && isPaid) {
        userUpdates.admin_courtesy = false;
        userUpdates.admin_courtesy_granted_by = null;
        userUpdates.admin_courtesy_granted_at = null;
      }

      // ✅ USAR FUNÇÃO ATÔMICA se PAGOU (previne race condition com admin)
      if (isPaid) {
        try {
          const result = await activateUserAtomic(user.id, plan || 'starter', {
            isPaid: true,
            toolsUnlocked: plan === 'pro' || plan === 'studio' || plan === 'enterprise',
            subscriptionStatus: subscription.status,
            adminId: undefined // Webhook não tem admin
          });

          // 🆕 GARANTIA DE DESBLOQUEIO: Se o usuário estava bloqueado por cortesia expirada, liberar agora.
          // O activateUserAtomic pode não limpar is_blocked dependendo da versão do RPC.
          if (user.is_blocked) {
             console.log('[Webhook] 🔓 Desbloqueando usuário após pagamento confirmado');
             await supabaseAdmin.from('users').update({
               is_blocked: false,
               blocked_reason: null,
               blocked_at: null
             }).eq('id', user.id);
          }

          console.log(`[Webhook] ✅ Ativação atômica: ${result.message}`);

        } catch (activationError: any) {
          console.error('[Webhook] ❌ Erro na ativação atômica:', activationError);
          // 🔧 CORREÇÃO: Propagar erro para Stripe fazer retry
          throw activationError;
        }
      } else {
        // Boleto PENDENTE - apenas atualizar status sem liberar limites
        console.log('[Webhook] ⏳ Boleto pendente - aguardando compensação');

        await supabaseAdmin
          .from('users')
          .update(userUpdates)
          .eq('id', user.id);
      }

      // Registrar pagamento com status fiel (succeeded ou pending)
      await supabaseAdmin.from('payments').insert({
        user_id: user.id,
        customer_id: customer?.id,
        stripe_payment_id: session.payment_intent as string,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_subscription_id: subscription.id,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || 'brl',
        status: isPaid ? 'succeeded' : 'pending', // ⚠️ CRUCIAL: 'pending' não infla a receita do admin
        payment_method: session.payment_method_types?.[0] || 'card',
        description: `Assinatura ${plan === 'studio' ? 'Studio' : plan === 'pro' ? 'Pro' : 'Starter'} (${isPaid ? 'Confirmado' : 'Aguardando Compensação'})`,
        plan_type: plan || 'starter',
        metadata: {
          stripe_checkout_id: session.id,
          payment_status: session.payment_status
        }
      });

      // 🆕 CORREÇÃO: Salvar subscription no banco (previne erro em webhooks subsequentes)
      if (customer?.id) {
        try {
          const { error: subError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              customer_id: customer.id,
              stripe_subscription_id: subscription.id,
              stripe_price_id: subscription.items.data[0].price.id,
              stripe_product_id: typeof subscription.items.data[0].price.product === 'string'
                ? subscription.items.data[0].price.product
                : subscription.items.data[0].price.product.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              metadata: subscription.metadata || {}
            }, {
              onConflict: 'stripe_subscription_id'
            });

          if (subError) {
            console.warn(`[Webhook] ⚠️ Erro ao salvar subscription: ${subError.message}`);
          } else {
            console.log(`[Webhook] ✅ Subscription ${subscription.id} salva no banco`);
          }
        } catch (subSaveError: any) {
          console.warn(`[Webhook] ⚠️ Erro ao salvar subscription: ${subSaveError.message}`);
          // Não throw - subscription pode ser criada pelo webhook customer.subscription.created
        }
      }

      // Log se foi iniciado pelo admin e concluiu pagamento
      if (isAdminInitiated && adminId && isPaid) {
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
 * checkout.session.async_payment_succeeded
 * Quando BOLETO é compensado (pagamento assíncrono confirmado)
 * 
 * CRÍTICO: Este evento é disparado APÓS o boleto ser pago no banco.
 * Precisamos FORÇAR isPaid=true pois o payment_status da session original
 * pode ainda estar como 'unpaid' dependendo do timing.
 */
async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] 🎉 BOLETO PAGO! Checkout ${session.id}`);
  console.log(`  - payment_status original: "${session.payment_status}"`);
  console.log(`  - payment_method_types: ${JSON.stringify(session.payment_method_types)}`);

  const clerkId = session.client_reference_id || session.metadata?.clerk_id;
  const plan = session.metadata?.plan as 'starter' | 'pro' | 'studio' | 'enterprise' | undefined;

  if (!clerkId) {
    throw new Error('Async payment session sem clerk_id');
  }

  // 1. Buscar usuário
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, is_blocked')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) {
    throw new Error(`Usuário não encontrado: ${clerkId}`);
  }

  // 2. Processar subscription (se existir)
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    console.log(`[Webhook] ✅ Ativando usuário ${user.email} via BOLETO PAGO`);

    // 🔧 FORÇAR isPaid = true (independente do session.payment_status)
    const planType = plan || 'starter';
    
    try {
      const result = await activateUserAtomic(user.id, planType, {
        isPaid: true, // SEMPRE true para async_payment_succeeded
        toolsUnlocked: planType === 'pro' || planType === 'studio' || planType === 'enterprise',
        subscriptionStatus: 'active',
        adminId: undefined
      });

      // Desbloquear se estava bloqueado
      if (user.is_blocked) {
        console.log('[Webhook] 🔓 Desbloqueando usuário após boleto pago');
        await supabaseAdmin.from('users').update({ 
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null 
        }).eq('id', user.id);
      }

      // Atualizar subscription_id e expires_at
      await supabaseAdmin.from('users').update({
        subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
      }).eq('id', user.id);

      console.log(`[Webhook] ✅ BOLETO ativação: ${result.message}`);

    } catch (activationError: any) {
      console.error('[Webhook] ❌ Erro na ativação via boleto:', activationError);
      
      // Fallback: Atualizar manualmente
      await supabaseAdmin
        .from('users')
        .update({
          plan: planType,
          is_paid: true,
          subscription_status: 'active',
          subscription_id: subscription.id,
          subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          tools_unlocked: planType === 'pro' || planType === 'studio' || planType === 'enterprise',
          is_blocked: false,
          blocked_reason: null
        })
        .eq('id', user.id);
    }

    // Buscar customer para registrar pagamento
    const customer = await CustomerService.getByUserId(user.id);

    // Atualizar pagamento existente de 'pending' para 'succeeded'
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPayment) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'succeeded',
          description: `Assinatura ${planType === 'pro' ? 'Pro' : 'Starter'} (Boleto Confirmado)`
        })
        .eq('id', existingPayment.id);
      
      console.log(`[Webhook] 💰 Pagamento ${existingPayment.id} atualizado para 'succeeded'`);
    } else {
      // Criar novo registro de pagamento
      await supabaseAdmin.from('payments').insert({
        user_id: user.id,
        customer_id: customer?.id,
        stripe_payment_id: session.payment_intent as string,
        stripe_subscription_id: subscription.id,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || 'brl',
        status: 'succeeded',
        payment_method: 'boleto',
        description: `Assinatura ${planType === 'pro' ? 'Pro' : 'Starter'} (Boleto Pago)`,
        plan_type: planType
      });
    }

    // 🆕 CORREÇÃO: Salvar subscription no banco (previne erro em webhooks subsequentes)
    if (customer?.id) {
      try {
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            stripe_product_id: typeof subscription.items.data[0].price.product === 'string'
              ? subscription.items.data[0].price.product
              : subscription.items.data[0].price.product.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            metadata: subscription.metadata || {}
          }, {
            onConflict: 'stripe_subscription_id'
          });

        if (subError) {
          console.warn(`[Webhook] ⚠️ Erro ao salvar subscription (boleto): ${subError.message}`);
        } else {
          console.log(`[Webhook] ✅ Subscription ${subscription.id} salva no banco (boleto)`);
        }
      } catch (subSaveError: any) {
        console.warn(`[Webhook] ⚠️ Erro ao salvar subscription (boleto): ${subSaveError.message}`);
      }
    }
  }

  console.log(`[Webhook] ✅ Boleto processado com sucesso para ${user.email}`);
}

/**
 * customer.subscription.created
 * Quando nova assinatura é criada
 * ATUALIZADO: Cria organização automaticamente para Studio/Enterprise
 * ATUALIZADO: Cria customer automaticamente se não existir
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const stripeCustomerId = subscription.customer as string;

  // Buscar customer - se não existir, tentar criar
  let customer = await CustomerService.getByStripeId(stripeCustomerId);

  if (!customer) {
    console.log(`[Webhook] Customer ${stripeCustomerId} não encontrado. Tentando criar...`);

    // Buscar dados do customer no Stripe
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);

    if (stripeCustomer.deleted) {
      throw new Error(`Customer ${stripeCustomerId} foi deletado no Stripe`);
    }

    // Tentar encontrar usuário pelo email ou clerk_id nos metadados
    const customerEmail = stripeCustomer.email;
    const clerkId = subscription.metadata?.clerk_id || stripeCustomer.metadata?.clerk_id;

    let userId: string | null = null;

    // Buscar por clerk_id primeiro (mais confiável)
    if (clerkId) {
      const { data: userByClerk } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_id', clerkId)
        .single();

      if (userByClerk) {
        userId = userByClerk.id;
      }
    }

    // Se não encontrou por clerk_id, buscar por email
    if (!userId && customerEmail) {
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', customerEmail)
        .single();

      if (userByEmail) {
        userId = userByEmail.id;
      }
    }

    if (!userId) {
      console.error(`[Webhook] ❌ Não foi possível encontrar usuário para customer ${stripeCustomerId}`);
      console.error(`  - Email: ${customerEmail}`);
      console.error(`  - Clerk ID: ${clerkId}`);
      throw new Error(`Usuário não encontrado para customer ${stripeCustomerId}`);
    }

    // Criar customer no banco
    const { data: newCustomer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        email: customerEmail || '',
        nome: stripeCustomer.name || ''
      })
      .select()
      .single();

    if (customerError) {
      // Se erro de duplicação, buscar novamente
      if (customerError.code === '23505') {
        customer = await CustomerService.getByStripeId(stripeCustomerId);
        if (!customer) {
          throw new Error(`Erro ao criar customer: ${customerError.message}`);
        }
        console.log(`[Webhook] Customer já existia (race condition), usando existente`);
      } else {
        throw new Error(`Erro ao criar customer: ${customerError.message}`);
      }
    } else {
      customer = newCustomer;
      console.log(`[Webhook] ✅ Customer criado: ${customer?.id}`);
    }
  }

  // Validação final: garantir que customer existe
  if (!customer) {
    throw new Error(`Customer não pôde ser criado ou encontrado: ${stripeCustomerId}`);
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
    current_period_start: safeTimestampToISO(subscription.current_period_start)!,
    current_period_end: safeTimestampToISO(subscription.current_period_end)!,
    trial_start: safeTimestampToISO(subscription.trial_start),
    trial_end: safeTimestampToISO(subscription.trial_end),
    metadata: subscription.metadata
  });

  // =====================================================
  // MULTI-USER: Criar organização para Studio/Enterprise
  // =====================================================
  if (planType === 'studio' || planType === 'enterprise') {
    // Buscar dados completos do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('id', customer.user_id)
      .single();

    if (user) {
      // Criar organização automaticamente
      const orgName = user.name
        ? `${user.name}'s ${planType === 'studio' ? 'Studio' : 'Enterprise'}`
        : `${user.email.split('@')[0]}'s ${planType === 'studio' ? 'Studio' : 'Enterprise'}`;

      const result = await createOrganization({
        name: orgName,
        plan: planType as 'studio' | 'enterprise',
        owner_id: user.id,
        subscription_id: subscription.id,
      });

      if (result.success) {
        console.log(`[Webhook] ✅ Organization created for ${planType}: ${result.organization?.id}`);

        // Atualizar usuário (sem plan/subscription_id pois agora está na org)
        await supabaseAdmin
          .from('users')
          .update({
            subscription_status: subscription.status,
            is_paid: true,
            tools_unlocked: true
          })
          .eq('id', customer.user_id);
      } else {
        console.error(`[Webhook] ❌ Failed to create organization: ${result.error}`);
        // Fallback: atualizar usuário normalmente
        await supabaseAdmin
          .from('users')
          .update({
            plan: planType,
            subscription_status: subscription.status,
            subscription_id: subscription.id,
            is_paid: true,
            tools_unlocked: true
          })
          .eq('id', customer.user_id);
      }
    }
  }
  // =====================================================
  // PLANOS INDIVIDUAIS: Free/Starter/Pro
  // =====================================================
  else {
    // Atualizar usuário (plano individual)
    await supabaseAdmin
      .from('users')
      .update({
        plan: planType,
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        is_paid: true,
        tools_unlocked: planType === 'pro'
      })
      .eq('id', customer.user_id);
  }

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
      subscription_expires_at: safeTimestampToISO(subscription.current_period_end),
      is_paid: ['active', 'trialing'].includes(subscription.status)
    })
    .eq('subscription_id', subscription.id);

}

/**
 * customer.subscription.deleted
 * Quando assinatura é cancelada/deletada
 * ATUALIZADO: Cancela organização para Studio/Enterprise
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

  // =====================================================
  // MULTI-USER: Cancelar organização se existir
  // =====================================================
  const { data: organization } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();

  if (organization) {
    // Atualizar status da organização
    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: 'canceled',
        subscription_expires_at: new Date().toISOString()
      })
      .eq('id', organization.id);

    console.log(`[Webhook] ✅ Organization subscription canceled: ${organization.id}`);

    // Atualizar usuário (owner) sem reverter para free
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'canceled',
        is_paid: false,
        tools_unlocked: false
      })
      .eq('id', organization.owner_id);
  } else {
    // Sem organização = plano individual, reverter para free
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'canceled',
        is_paid: false,
        plan: 'free',
        tools_unlocked: false
      })
      .eq('subscription_id', subscription.id);
  }

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

  // Buscar plano do price_id
  const planMapping = getPlanFromPriceId(subscription.items.data[0].price.id);
  const planType = (planMapping?.tier || 'starter') as PlanType;

  // ✅ CORREÇÃO BUG CRÍTICO: Usar activateUserAtomic() para resetar limites
  // Antes: apenas atualizava is_paid=true SEM resetar ai_usage
  // Agora: reseta contadores para usuários pagantes (especialmente BOLETOS)
  try {
    const result = await activateUserAtomic(customer.user_id, planType, {
      isPaid: true,
      toolsUnlocked: planType === 'pro' || planType === 'studio' || planType === 'enterprise',
      subscriptionStatus: 'active',
      adminId: undefined // Webhook não tem admin
    });

    console.log(`[Webhook] ✅ Invoice paid - ${result.message} (resetado ${result.deleted_records} registros)`);

  } catch (activationError: any) {
    console.error('[Webhook] ❌ Erro ao ativar via invoice.payment_succeeded:', activationError);

    // Fallback: Atualizar manualmente (sem reset de limites)
    console.warn('[Webhook] ⚠️ Aplicando fallback (SEM RESET DE LIMITES)');
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_expires_at: safeTimestampToISO(subscription.current_period_end),
        is_paid: true
      })
      .eq('subscription_id', subscription.id);
  }

  // Registrar pagamento

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
 * invoice.created
 * Quando invoice é criada (geralmente 3 dias antes do vencimento)
 * Para boletos, precisamos FINALIZAR a invoice para gerar o boleto
 */
async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  console.log(`[Webhook] 📄 Invoice criada: ${invoice.id}`);
  console.log(`  - status: ${invoice.status}`);
  console.log(`  - collection_method: ${invoice.collection_method}`);
  console.log(`  - subscription: ${invoice.subscription}`);

  // Se invoice está como draft, finalizar para gerar boleto
  if (invoice.status === 'draft' && invoice.subscription) {
    try {
      console.log(`[Webhook] 🎫 Finalizando invoice ${invoice.id} para gerar boleto...`);
      
      await stripe.invoices.finalizeInvoice(invoice.id, {
        auto_advance: true // Permite que o Stripe tente cobrar automaticamente
      });

      console.log(`[Webhook] ✅ Invoice ${invoice.id} finalizada com sucesso`);

    } catch (finalizeError: any) {
      // Se já estiver finalizada, apenas logar
      if (finalizeError.code === 'invoice_not_editable') {
        console.log(`[Webhook] ℹ️ Invoice ${invoice.id} já estava finalizada`);
      } else {
        console.error(`[Webhook] ❌ Erro ao finalizar invoice:`, finalizeError.message);
        throw finalizeError;
      }
    }
  }
}

/**
 * invoice.finalized
 * Quando invoice é finalizada e boleto está pronto
 * Aqui enviamos notificação ao usuário com link do boleto
 */
async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  console.log(`[Webhook] 🎫 Invoice finalizada: ${invoice.id}`);
  console.log(`  - hosted_invoice_url: ${invoice.hosted_invoice_url}`);

  // Verificar se tem boleto
  const paymentSettings = invoice.payment_settings;
  const hasBoleto = paymentSettings?.payment_method_types?.includes('boleto');

  if (!hasBoleto) {
    console.log(`[Webhook] ℹ️ Invoice ${invoice.id} não é boleto, ignorando`);
    return;
  }

  // Buscar customer
  const customer = await CustomerService.getByStripeId(invoice.customer as string);

  if (!customer) {
    console.warn(`[Webhook] ⚠️ Customer não encontrado para invoice ${invoice.id}`);
    return;
  }

  // Buscar dados do usuário
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .eq('id', customer.user_id)
    .single();

  if (!user) {
    console.warn(`[Webhook] ⚠️ Usuário não encontrado para customer ${customer.id}`);
    return;
  }

  // Inserir pagamento pendente no banco
  await supabaseAdmin.from('payments').upsert({
    user_id: user.id,
    customer_id: customer.id,
    stripe_payment_id: invoice.payment_intent as string || `inv_${invoice.id}`,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription as string,
    amount: (invoice.amount_due || 0) / 100,
    currency: invoice.currency?.toUpperCase() || 'BRL',
    status: 'pending',
    payment_method: 'boleto',
    description: `Boleto - Aguardando pagamento`,
    invoice_url: invoice.hosted_invoice_url || undefined
  }, {
    onConflict: 'stripe_payment_id'
  });

  console.log(`[Webhook] ✅ Boleto disponível para ${user.email}`);
  console.log(`  - Link: ${invoice.hosted_invoice_url}`);

  // TODO: Enviar email com link do boleto
  // await sendBoletoEmail(user.email, user.name, invoice.hosted_invoice_url);
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
