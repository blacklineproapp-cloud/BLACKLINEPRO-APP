/**
 * Asaas Webhooks Handler
 *
 * Processa eventos do Asaas para atualizar status de pagamentos e assinaturas
 *
 * Eventos tratados:
 * - PAYMENT_RECEIVED: Pagamento confirmado → ativar usuário
 * - PAYMENT_CONFIRMED: Pagamento confirmado (cartão) → ativar usuário
 * - PAYMENT_OVERDUE: Pagamento vencido → notificar
 * - PAYMENT_REFUNDED: Estorno → desativar usuário
 * - SUBSCRIPTION_CREATED: Assinatura criada
 * - SUBSCRIPTION_DELETED: Assinatura cancelada → desativar usuário
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { logger, webhookLogger } from '@/lib/logger';
import {
  AsaasCustomerService,
  AsaasSubscriptionService,
  AsaasPaymentService,
  ASAAS_CONFIG,
} from '@/lib/asaas';
import { activateUserAtomic } from '@/lib/admin/user-activation';
import type {
  AsaasWebhookPayload,
  AsaasPayment,
  AsaasSubscription,
  ASAAS_PLANS,
} from '@/lib/asaas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Validar token de autenticação (OBRIGATÓRIO)
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || ASAAS_CONFIG.webhookToken;

    if (!webhookToken) {
      logger.error('[Asaas Webhook] ASAAS_WEBHOOK_TOKEN não configurado');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const headersList = await headers();
    const token = headersList.get('asaas-access-token');

    // Usar comparação segura contra timing attacks
    const isValidToken = token &&
      token.length === webhookToken.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(webhookToken));

    if (!isValidToken) {
      logger.error('[Asaas Webhook] Token inválido ou ausente');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse do payload
    const payload: AsaasWebhookPayload = await req.json();
    const { event, payment, subscription } = payload;

    // 3. Verificar idempotência
    // ID único sem timestamp para garantir idempotência real
    const eventId = `asaas_${event}_${payment?.id || subscription?.id}`;

    webhookLogger.received(event, eventId);

    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', eventId)
      .single();

    if (existingEvent?.status === 'completed') {
      webhookLogger.duplicate(event, eventId);
      return NextResponse.json({ message: 'Event already processed' });
    }

    // Registrar evento como processando
    await supabaseAdmin.from('webhook_events').upsert({
      event_id: eventId,
      event_type: event,
      source: 'asaas',
      status: 'processing',
      payload: payload as any,
    }, {
      onConflict: 'event_id',
    });

    // 4. Processar evento
    try {
      switch (event) {
        // ==========================================
        // EVENTOS DE PAGAMENTO
        // ==========================================

        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          if (payment) {
            await handlePaymentReceived(payment);
          }
          break;

        case 'PAYMENT_CREATED':
          if (payment) {
            await handlePaymentCreated(payment);
          }
          break;

        case 'PAYMENT_OVERDUE':
          if (payment) {
            await handlePaymentOverdue(payment);
          }
          break;

        case 'PAYMENT_REFUNDED':
        case 'PAYMENT_DELETED':
          if (payment) {
            await handlePaymentRefunded(payment);
          }
          break;

        case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
          if (payment) {
            await handlePaymentFailed(payment);
          }
          break;

        case 'PAYMENT_RECEIVED_IN_CASH':
          if (payment) {
            await handlePaymentReceived(payment); // Mesmo handler de pagamento recebido
          }
          break;

        case 'PAYMENT_AWAITING_RISK_ANALYSIS':
          // Manter como pendente - não faz nada, apenas log
          console.log(`[Asaas Webhook] 🔍 Pagamento em análise de risco: ${payment?.id}`);
          break;

        case 'PAYMENT_DUNNING_RECEIVED':
          // Cobrança de recuperação paga - reativar usuário
          if (payment) {
            await handlePaymentReceived(payment);
          }
          break;

        case 'PAYMENT_DUNNING_REQUESTED':
          // Tentativa de recuperação - apenas log
          console.log(`[Asaas Webhook] 📩 Tentativa de recuperação: ${payment?.id}`);
          break;

        case 'PAYMENT_CHARGEBACK_REQUESTED':
        case 'PAYMENT_CHARGEBACK_DISPUTE':
          if (payment) {
            await handleChargeback(payment);
          }
          break;

        // ==========================================
        // EVENTOS DE ASSINATURA
        // ==========================================

        case 'SUBSCRIPTION_CREATED':
          if (subscription) {
            await handleSubscriptionCreated(subscription);
          }
          break;

        case 'SUBSCRIPTION_UPDATED':
          if (subscription) {
            await handleSubscriptionUpdated(subscription);
          }
          break;

        case 'SUBSCRIPTION_DELETED':
        case 'SUBSCRIPTION_INACTIVATED':
          if (subscription) {
            await handleSubscriptionCanceled(subscription);
          }
          break;

        case 'SUBSCRIPTION_PAYMENT_OVERDUE':
          // Pagamento de assinatura vencido - inicia grace period
          if (payment) {
            await handlePaymentOverdue(payment);
          }
          break;

        default:
          console.log(`[Asaas Webhook] Evento não tratado: ${event}`);
      }

      // Marcar como concluído
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId);

      webhookLogger.processed(event, eventId);
      return NextResponse.json({ message: 'OK' });

    } catch (processError: any) {
      webhookLogger.failed(event, eventId, processError);

      // Marcar como falha
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: processError.message,
        })
        .eq('event_id', eventId);

      // Retornar 500 para Asaas tentar novamente
      return NextResponse.json(
        { error: processError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    logger.error('[Asaas Webhook] Erro geral', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLERS DE PAGAMENTO
// ============================================================================

/**
 * PAYMENT_RECEIVED / PAYMENT_CONFIRMED
 * Pagamento confirmado → ativar usuário
 */
async function handlePaymentReceived(payment: AsaasPayment) {
  console.log(`[Asaas Webhook] 💰 Pagamento recebido: ${payment.id} - R$ ${payment.value}`);

  // 1. Buscar customer no banco
  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    console.error(`[AsaasWebhook] Customer não encontrado: ${payment.customer}`);
    throw new Error(`Customer not found: ${payment.customer}`);
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  // 2. Determinar plano pelo valor ou metadata
  const plan = getPlanFromPayment(payment);

  // 3. Ativar usuário
  try {
    const result = await activateUserAtomic(dbCustomer.user_id, plan, {
      isPaid: true,
      toolsUnlocked: plan === 'pro' || plan === 'studio' || plan === 'enterprise',
      subscriptionStatus: 'active',
    });

    console.log(`[Asaas Webhook] ✅ Usuário ativado: ${result.message}`);

    // Desbloquear e limpar grace period
    await supabaseAdmin.from('users').update({
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      grace_period_until: null, // Limpar grace period
    }).eq('id', dbCustomer.user_id);

  } catch (activationError: any) {
    console.error('[Asaas Webhook] Erro na ativação:', activationError);

    // Fallback: atualizar manualmente
    await supabaseAdmin.from('users').update({
      plan,
      is_paid: true,
      subscription_status: 'active',
      tools_unlocked: plan === 'pro' || plan === 'studio' || plan === 'enterprise',
      is_blocked: false,
      grace_period_until: null, // Limpar grace period
      asaas_subscription_id: payment.subscription || null,
    }).eq('id', dbCustomer.user_id);
  }

  // 4. Atualizar subscription_expires_at se for assinatura
  if (payment.subscription) {
    const subscription = await AsaasSubscriptionService.getById(payment.subscription);
    if (subscription) {
      await supabaseAdmin.from('users').update({
        subscription_expires_at: subscription.nextDueDate,
        asaas_subscription_id: subscription.id,
      }).eq('id', dbCustomer.user_id);
    }
  }

  // 5. Salvar pagamento no banco
  try {
    console.log(`[Asaas Webhook] Salvando pagamento no banco...`, {
      userId: dbCustomer.user_id,
      customerId: dbCustomer.id,
      paymentId: payment.id,
      plan,
    });

    await AsaasPaymentService.saveToDatabase({
      userId: dbCustomer.user_id,
      customerId: dbCustomer.id,
      payment,
      plan,
      customerSource: source,
    });

    console.log(`[Asaas Webhook] ✅ Pagamento salvo com sucesso: ${payment.id}`);
  } catch (saveError: any) {
    console.error(`[Asaas Webhook] ❌ Erro ao salvar pagamento:`, saveError);
    // Não lançar erro para não bloquear o webhook
  }
}

/**
 * PAYMENT_CREATED
 * Cobrança criada (boleto/PIX gerado)
 */
async function handlePaymentCreated(payment: AsaasPayment) {
  console.log(`[Asaas Webhook] 📄 Cobrança criada: ${payment.id} - ${payment.billingType}`);

  // 1. Buscar customer
  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    console.warn(`[Asaas Webhook] Customer não encontrado para cobrança: ${payment.customer}`);
    return;
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  // Salvar como pendente
  const plan = getPlanFromPayment(payment);

  await AsaasPaymentService.saveToDatabase({
    userId: dbCustomer.user_id,
    customerId: dbCustomer.id,
    payment,
    plan,
    customerSource: source,
  });

  // TODO: Enviar email com link do boleto/PIX
  if (payment.billingType === 'BOLETO' && payment.bankSlipUrl) {
    console.log(`[Asaas Webhook] 🎫 Boleto disponível: ${payment.bankSlipUrl}`);
  }
}

/**
 * PAYMENT_OVERDUE
 * Pagamento vencido → Inicia grace period de 3 dias
 */
async function handlePaymentOverdue(payment: AsaasPayment) {
  console.log(`[Asaas Webhook] ⚠️ Pagamento vencido: ${payment.id}`);

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer } = dbCustomerResult;

  // Calcular grace period de 1 dia (prazo curto para regularização)
  const gracePeriodUntil = new Date();
  gracePeriodUntil.setDate(gracePeriodUntil.getDate() + 1);

  // Atualizar status do usuário com grace period
  await supabaseAdmin.from('users').update({
    subscription_status: 'past_due',
    grace_period_until: gracePeriodUntil.toISOString(),
  }).eq('id', dbCustomer.user_id);

  // Atualizar pagamento no banco
  await AsaasPaymentService.updateDatabaseStatus(payment.id, 'OVERDUE');

  console.log(`[Asaas Webhook] ⏰ Grace period até: ${gracePeriodUntil.toISOString()}`);

  // TODO: Enviar email de cobrança urgente
  // - Assunto: "Seu pagamento venceu - Regularize em até 24 horas"
  // - Link para pagar
  // - Aviso que funcionalidades serão bloqueadas após 1 dia
}

/**
 * PAYMENT_REFUNDED / PAYMENT_DELETED
 * Pagamento estornado ou removido
 */
async function handlePaymentRefunded(payment: AsaasPayment) {
  console.log(`[Asaas Webhook] 💸 Pagamento estornado: ${payment.id}`);

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer } = dbCustomerResult;

  // Verificar se é a única cobrança paga
  const { count } = await supabaseAdmin
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', dbCustomer.user_id)
    .eq('status', 'succeeded');

  // Se não tiver outras cobranças pagas, desativar
  if (!count || count <= 1) {
    await supabaseAdmin.from('users').update({
      is_paid: false,
      subscription_status: 'canceled',
      tools_unlocked: false,
    }).eq('id', dbCustomer.user_id);
  }

  // Atualizar pagamento
  await AsaasPaymentService.updateDatabaseStatus(payment.id, 'REFUNDED');
}

/**
 * PAYMENT_CREDIT_CARD_CAPTURE_REFUSED
 * Cartão recusado
 */
async function handlePaymentFailed(payment: AsaasPayment) {
  console.log(`[Asaas Webhook] ❌ Pagamento falhou: ${payment.id}`);

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  // Salvar falha
  await AsaasPaymentService.saveToDatabase({
    userId: dbCustomer.user_id,
    customerId: dbCustomer.id,
    payment,
    customerSource: source,
  });

  // TODO: Enviar email sobre falha
}

/**
 * PAYMENT_CHARGEBACK_REQUESTED / PAYMENT_CHARGEBACK_DISPUTE
 * Chargeback solicitado - bloquear usuário e investigar
 */
async function handleChargeback(payment: AsaasPayment) {
  console.log(`[Asaas Webhook] ⚠️ CHARGEBACK: ${payment.id}`);

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer } = dbCustomerResult;

  // Bloquear usuário imediatamente
  await supabaseAdmin.from('users').update({
    is_blocked: true,
    blocked_reason: 'chargeback_requested',
    blocked_at: new Date().toISOString(),
    subscription_status: 'suspended',
  }).eq('id', dbCustomer.user_id);

  // Atualizar pagamento
  await supabaseAdmin.from('payments').update({
    status: 'chargeback',
    metadata: { chargeback_requested_at: new Date().toISOString() },
  }).eq('asaas_payment_id', payment.id);

  console.log(`[Asaas Webhook] 🚫 Usuário bloqueado por chargeback: ${dbCustomer.user_id}`);

  // TODO: Enviar email de notificação sobre chargeback
  // TODO: Notificar admin sobre chargeback
}

// ============================================================================
// HANDLERS DE ASSINATURA
// ============================================================================

/**
 * SUBSCRIPTION_CREATED
 * Assinatura criada
 */
async function handleSubscriptionCreated(subscription: AsaasSubscription) {
  console.log(`[Asaas Webhook] 📦 Assinatura criada: ${subscription.id}`);

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(subscription.customer);

  if (!dbCustomerResult) {
    console.error(`[Asaas Webhook] Customer não encontrado: ${subscription.customer}`);
    return;
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  const plan = getPlanFromValue(subscription.value);

  await AsaasSubscriptionService.saveToDatabase({
    userId: dbCustomer.user_id,
    customerId: dbCustomer.id,
    subscription,
    plan,
    customerSource: source,
  });

  // Atualizar usuário (não ativar ainda - aguardar pagamento)
  await supabaseAdmin.from('users').update({
    asaas_subscription_id: subscription.id,
    subscription_status: subscription.status.toLowerCase(),
    subscription_expires_at: subscription.nextDueDate,
    plan,
  }).eq('id', dbCustomer.user_id);
}

/**
 * SUBSCRIPTION_UPDATED
 * Assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription: AsaasSubscription) {
  console.log(`[Asaas Webhook] 🔄 Assinatura atualizada: ${subscription.id} - ${subscription.status}`);

  // Sincronizar com banco
  await AsaasSubscriptionService.syncFromAsaas(subscription.id);
}

/**
 * SUBSCRIPTION_DELETED / SUBSCRIPTION_INACTIVATED
 * Assinatura cancelada
 */
async function handleSubscriptionCanceled(subscription: AsaasSubscription) {
  console.log(`[Asaas Webhook] ❌ Assinatura cancelada: ${subscription.id}`);

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(subscription.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer } = dbCustomerResult;

  // Atualizar usuário
  await supabaseAdmin.from('users').update({
    subscription_status: 'canceled',
    is_paid: false,
    tools_unlocked: false,
    plan: 'free',
  }).eq('asaas_subscription_id', subscription.id);

  // Atualizar assinatura no banco
  await supabaseAdmin.from('subscriptions').update({
    status: 'canceled',
    updated_at: new Date().toISOString(),
  }).eq('asaas_subscription_id', subscription.id);

  // TODO: Enviar email de cancelamento
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determina o plano baseado no valor
 */
/**
 * Extrai o plano do pagamento usando description ou externalReference
 * Fallback para valor se não encontrar
 */
function getPlanFromPayment(payment: AsaasPayment): 'free' | 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy' {
  const ref = (payment.externalReference || '').toLowerCase();
  const desc = (payment.description || '').toLowerCase();
  const searchText = `${ref} ${desc}`;

  // Tentar extrair do texto (externalReference ou description)
  if (searchText.includes('enterprise')) return 'enterprise';
  if (searchText.includes('studio')) return 'studio';
  if (searchText.includes('pro')) return 'pro';
  if (searchText.includes('starter')) return 'starter';
  if (searchText.includes('legacy')) return 'legacy';

  // Fallback: usar valor (preços mensais como referência)
  return getPlanFromValue(payment.value);
}

function getPlanFromValue(value: number): 'free' | 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy' {
  // Preços mensais como referência
  if (value >= 500) return 'enterprise';
  if (value >= 250) return 'studio';
  if (value >= 80) return 'pro';
  if (value >= 40) return 'starter';
  if (value >= 20) return 'legacy';
  return 'starter'; // Default
}
