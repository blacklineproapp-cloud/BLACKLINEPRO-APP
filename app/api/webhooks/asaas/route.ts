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
import {
  sendBoletoPixEmail,
  sendPaymentOverdueEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/email';
import type {
  AsaasWebhookPayload,
  AsaasPayment,
  AsaasSubscription,
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
      payload: payload as unknown,
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
          logger.info('[Asaas Webhook] Pagamento em análise de risco', { paymentId: payment?.id });
          break;

        case 'PAYMENT_DUNNING_RECEIVED':
          // Cobrança de recuperação paga - reativar usuário
          if (payment) {
            await handlePaymentReceived(payment);
          }
          break;

        case 'PAYMENT_DUNNING_REQUESTED':
          // Tentativa de recuperação - apenas log
          logger.info('[Asaas Webhook] Tentativa de recuperação', { paymentId: payment?.id });
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
          logger.info('[Asaas Webhook] Evento não tratado', { event });
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

    } catch (processError: unknown) {
      webhookLogger.failed(event, eventId, processError instanceof Error ? processError : new Error(String(processError)));

      const errorMessage = processError instanceof Error ? processError.message : String(processError);

      // Marcar como falha
      await supabaseAdmin
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('event_id', eventId);

      // Retornar 500 para Asaas tentar novamente
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
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
  logger.info('[Asaas Webhook] Pagamento recebido', { paymentId: payment.id, value: payment.value });

  // 1. Buscar customer no banco
  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    logger.error('[AsaasWebhook] Customer não encontrado', { customerId: payment.customer });
    throw new Error(`Customer not found: ${payment.customer}`);
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  // 2. Determinar plano via externalReference → banco → description
  const plan = await getPlanFromPayment(payment);

  // 3. Ativar usuário
  try {
    const result = await activateUserAtomic(dbCustomer.user_id, plan, {
      isPaid: true,
      toolsUnlocked: plan === 'pro' || plan === 'studio',
      subscriptionStatus: 'active',
    });

    logger.info('[Asaas Webhook] Usuário ativado', { message: result.message });

    // Desbloquear e limpar grace period
    await supabaseAdmin.from('users').update({
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      grace_period_until: null, // Limpar grace period
    }).eq('id', dbCustomer.user_id);

  } catch (activationError: unknown) {
    logger.error('[Asaas Webhook] Erro na ativação', activationError);

    // Fallback: atualizar manualmente
    await supabaseAdmin.from('users').update({
      plan,
      is_paid: true,
      subscription_status: 'active',
      tools_unlocked: plan === 'pro' || plan === 'studio',
      is_blocked: false,
      grace_period_until: null, // Limpar grace period
      asaas_subscription_id: payment.subscription || null,
    }).eq('id', dbCustomer.user_id);
  }

  // 4. Atualizar subscription ou criar uma se pagamento for avulso
  if (payment.subscription) {
    // Pagamento vinculado a assinatura — atualizar datas
    const subscription = await AsaasSubscriptionService.getById(payment.subscription);
    if (subscription) {
      await supabaseAdmin.from('users').update({
        subscription_expires_at: subscription.nextDueDate,
        asaas_subscription_id: subscription.id,
      }).eq('id', dbCustomer.user_id);
    }
  } else {
    // Pagamento AVULSO (sem subscription) — criar assinatura para evitar cobranca orphan
    // Isso acontece quando o checkout falha parcialmente: cria cobranca mas perde a assinatura
    logger.warn('[Asaas Webhook] Pagamento avulso detectado. Criando assinatura para o usuario', { paymentId: payment.id });

    try {
      // Buscar dados do usuario para determinar plano e ciclo
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('plan, asaas_subscription_id')
        .eq('id', dbCustomer.user_id)
        .single();

      // So criar se o usuario nao tem assinatura ativa
      if (userData && !userData.asaas_subscription_id) {
        const userPlan = plan !== 'free' ? plan : 'ink';
        const billingType = payment.billingType || 'PIX';

        const createMethod = billingType === 'BOLETO'
          ? AsaasSubscriptionService.createWithBoleto
          : AsaasSubscriptionService.createWithPix;

        const newSub = await createMethod.call(AsaasSubscriptionService, {
          customerId: payment.customer,
          plan: userPlan,
          cycle: 'monthly',
          externalReference: `${dbCustomer.user_id}_${userPlan}_monthly`,
        });

        await supabaseAdmin.from('users').update({
          asaas_subscription_id: newSub.id,
          subscription_expires_at: newSub.nextDueDate,
        }).eq('id', dbCustomer.user_id);

        logger.info('[Asaas Webhook] Assinatura criada para pagamento avulso', { subscriptionId: newSub.id });
      }
    } catch (subError: unknown) {
      // Nao bloquear o webhook se falhar — o usuario ja foi ativado acima
      logger.error('[Asaas Webhook] Erro ao criar assinatura para pagamento avulso', subError);
    }
  }

  // 5. Salvar pagamento no banco
  try {
    logger.debug('[Asaas Webhook] Salvando pagamento no banco', {
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

    logger.info('[Asaas Webhook] Pagamento salvo com sucesso', { paymentId: payment.id });
  } catch (saveError: unknown) {
    logger.error('[Asaas Webhook] Erro ao salvar pagamento', saveError);
    // Não lançar erro para não bloquear o webhook
  }
}

/**
 * PAYMENT_CREATED
 * Cobrança criada (boleto/PIX gerado)
 */
async function handlePaymentCreated(payment: AsaasPayment) {
  logger.info('[Asaas Webhook] Cobrança criada', { paymentId: payment.id, billingType: payment.billingType });

  // 1. Buscar customer
  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    logger.warn('[Asaas Webhook] Customer não encontrado para cobrança', { customerId: payment.customer });
    return;
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  // Salvar como pendente
  const plan = await getPlanFromPayment(payment);

  await AsaasPaymentService.saveToDatabase({
    userId: dbCustomer.user_id,
    customerId: dbCustomer.id,
    payment,
    plan,
    customerSource: source,
  });

  // Enviar email com link do boleto/PIX
  if ((payment.billingType === 'BOLETO' || payment.billingType === 'PIX') && payment.dueDate) {
    try {
      // Buscar dados do usuário
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email, name')
        .eq('id', dbCustomer.user_id)
        .single();

      if (userData?.email && userData?.name) {
        // Determinar URL de pagamento
        const paymentUrl = payment.billingType === 'BOLETO'
          ? payment.bankSlipUrl || '#'
          : payment.invoiceUrl || '#';

        await sendBoletoPixEmail(
          userData.email,
          userData.name,
          payment.billingType as 'BOLETO' | 'PIX',
          paymentUrl,
          payment.dueDate,
          payment.value
        );

        logger.info('[Asaas Webhook] Email de boleto/PIX enviado', { userId: dbCustomer.user_id, billingType: payment.billingType });
      }
    } catch (emailError: unknown) {
      logger.error('[Asaas Webhook] Erro ao enviar email de boleto/PIX', emailError);
      // Não bloquear o webhook se email falhar
    }
  }
}

/**
 * PAYMENT_OVERDUE
 * Pagamento vencido → Inicia grace period de 3 dias
 */
async function handlePaymentOverdue(payment: AsaasPayment) {
  logger.warn('[Asaas Webhook] Pagamento vencido', { paymentId: payment.id });

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

  logger.info('[Asaas Webhook] Grace period definido', { gracePeriodUntil: gracePeriodUntil.toISOString() });

  // Enviar email de cobrança urgente
  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', dbCustomer.user_id)
      .single();

    if (userData?.email && userData?.name) {
      await sendPaymentOverdueEmail(userData.email, userData.name, gracePeriodUntil);
      logger.info('[Asaas Webhook] Email de pagamento vencido enviado', { userId: dbCustomer.user_id });
    }
  } catch (emailError: unknown) {
    logger.error('[Asaas Webhook] Erro ao enviar email de pagamento vencido', emailError);
    // Não bloquear o webhook se email falhar
  }
}

/**
 * PAYMENT_REFUNDED / PAYMENT_DELETED
 * Pagamento estornado ou removido
 */
async function handlePaymentRefunded(payment: AsaasPayment) {
  logger.info('[Asaas Webhook] Pagamento estornado', { paymentId: payment.id });

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
  logger.warn('[Asaas Webhook] Pagamento falhou', { paymentId: payment.id });

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

  // Iniciar grace period de 1 dia (mesmo comportamento de PAYMENT_OVERDUE)
  const gracePeriodUntil = new Date();
  gracePeriodUntil.setDate(gracePeriodUntil.getDate() + 1);

  await supabaseAdmin.from('users').update({
    subscription_status: 'past_due',
    grace_period_until: gracePeriodUntil.toISOString(),
  }).eq('id', dbCustomer.user_id);

  logger.info('[Asaas Webhook] Grace period (falha cartão) definido', { gracePeriodUntil: gracePeriodUntil.toISOString() });

  // Enviar email sobre falha no cartão
  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', dbCustomer.user_id)
      .single();

    if (userData?.email && userData?.name) {
      await sendPaymentFailedEmail(userData.email, userData.name, 'Erro ao processar seu cartão de crédito');
      logger.info('[Asaas Webhook] Email de falha no pagamento enviado', { userId: dbCustomer.user_id });
    }
  } catch (emailError: unknown) {
    logger.error('[Asaas Webhook] Erro ao enviar email de falha no pagamento', emailError);
    // Não bloquear o webhook se email falhar
  }
}

/**
 * PAYMENT_CHARGEBACK_REQUESTED / PAYMENT_CHARGEBACK_DISPUTE
 * Chargeback solicitado - bloquear usuário e investigar
 */
async function handleChargeback(payment: AsaasPayment) {
  logger.warn('[Asaas Webhook] CHARGEBACK', { paymentId: payment.id });

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(payment.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer } = dbCustomerResult;

  // Bloquear usuário imediatamente e remover status de pagante
  await supabaseAdmin.from('users').update({
    is_blocked: true,
    is_paid: false,
    blocked_reason: 'chargeback_requested',
    blocked_at: new Date().toISOString(),
    subscription_status: 'suspended',
    tools_unlocked: false,
  }).eq('id', dbCustomer.user_id);

  // Atualizar pagamento
  await supabaseAdmin.from('payments').update({
    status: 'chargeback',
    metadata: { chargeback_requested_at: new Date().toISOString() },
  }).eq('asaas_payment_id', payment.id);

  logger.warn('[Asaas Webhook] Usuário bloqueado por chargeback', { userId: dbCustomer.user_id });

  // Enviar email de notificação sobre chargeback
  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', dbCustomer.user_id)
      .single();

    if (userData?.email && userData?.name) {
      // Repurpose subscription canceled email with chargeback message
      await sendSubscriptionCanceledEmail(userData.email, userData.name);
      logger.info('[Asaas Webhook] Email de notificação de chargeback enviado', { userId: dbCustomer.user_id });
    }
  } catch (emailError: unknown) {
    logger.error('[Asaas Webhook] Erro ao enviar email de chargeback', emailError);
    // Não bloquear o webhook se email falhar
  }
}

// ============================================================================
// HANDLERS DE ASSINATURA
// ============================================================================

/**
 * SUBSCRIPTION_CREATED
 * Assinatura criada
 */
async function handleSubscriptionCreated(subscription: AsaasSubscription) {
  logger.info('[Asaas Webhook] Assinatura criada', { subscriptionId: subscription.id });

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(subscription.customer);

  if (!dbCustomerResult) {
    logger.error('[Asaas Webhook] Customer não encontrado', { customerId: subscription.customer });
    return;
  }

  const { data: dbCustomer, source } = dbCustomerResult;

  const plan = getPlanFromSubscription(subscription);

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
  logger.info('[Asaas Webhook] Assinatura atualizada', { subscriptionId: subscription.id, status: subscription.status });

  // Sincronizar com banco
  await AsaasSubscriptionService.syncFromAsaas(subscription.id);
}

/**
 * SUBSCRIPTION_DELETED / SUBSCRIPTION_INACTIVATED
 * Assinatura cancelada
 */
async function handleSubscriptionCanceled(subscription: AsaasSubscription) {
  logger.info('[Asaas Webhook] Assinatura cancelada', { subscriptionId: subscription.id });

  const dbCustomerResult = await AsaasCustomerService.getDbCustomerByAsaasId(subscription.customer);

  if (!dbCustomerResult) {
    return;
  }

  const { data: dbCustomer } = dbCustomerResult;

  // Atualizar usuário - APENAS status da assinatura
  // Mantemos is_paid=true e o plano atual para que o usuário tenha acesso
  // até o fim do período já pago (subscription_expires_at).
  // O cron job check-grace-period cuidará de remover o acesso na data exata.
  await supabaseAdmin.from('users').update({
    subscription_status: 'canceled',
    // is_paid: false, // <-- REMOVIDO: Manter acesso até expirar
    // tools_unlocked: false, // <-- REMOVIDO: Manter acesso até expirar
    // plan: 'free', // <-- REMOVIDO: Manter acesso até expirar
  }).eq('asaas_subscription_id', subscription.id);

  // Atualizar assinatura no banco
  await supabaseAdmin.from('subscriptions').update({
    status: 'canceled',
    updated_at: new Date().toISOString(),
  }).eq('asaas_subscription_id', subscription.id);

  // Enviar email de cancelamento
  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, name, subscription_expires_at')
      .eq('id', dbCustomer.user_id)
      .single();

    if (userData?.email && userData?.name) {
      const endDate = userData.subscription_expires_at
        ? new Date(userData.subscription_expires_at)
        : undefined;

      await sendSubscriptionCanceledEmail(userData.email, userData.name, endDate);
      logger.info('[Asaas Webhook] Email de cancelamento de assinatura enviado', { userId: dbCustomer.user_id });
    }
  } catch (emailError: unknown) {
    logger.error('[Asaas Webhook] Erro ao enviar email de cancelamento', emailError);
    // Não bloquear o webhook se email falhar
  }
}

// ============================================================================
// HELPERS
// ============================================================================

// Planos válidos para validação
const VALID_PLANS = ['free', 'ink', 'pro', 'studio'] as const;
type PlanResult = typeof VALID_PLANS[number];

function isValidPlan(value: string): value is PlanResult {
  return VALID_PLANS.includes(value as PlanResult);
}

/**
 * Extrai o plano do externalReference de forma estruturada.
 * Formato esperado: "{userId}_{plan}_{cycle}"
 */
function parsePlanFromReference(externalReference?: string): PlanResult | null {
  if (!externalReference) return null;

  const parts = externalReference.toLowerCase().split('_');
  // O formato é: uuid_plan_cycle (uuid pode conter hifens mas não underscores)
  // Pegar os dois últimos segmentos: plan e cycle
  if (parts.length < 3) return null;

  const plan = parts[parts.length - 2];
  return isValidPlan(plan) ? plan : null;
}

/**
 * Extrai o plano da description do Asaas.
 * Formato esperado: "Black Line Pro Pro - monthly"
 */
function parsePlanFromDescription(description?: string): PlanResult | null {
  if (!description) return null;

  const desc = description.toLowerCase();
  // Ordem do mais específico para o menos específico
  if (desc.includes('studio')) return 'studio';
  if (desc.includes('pro')) return 'pro';
  if (desc.includes('ink')) return 'ink';
  return null;
}

/**
 * Busca o plano salvo no banco de dados durante o checkout.
 * Fonte confiável: o plano foi registrado quando o pagamento foi criado.
 */
async function getPlanFromDatabase(asaasPaymentId: string): Promise<PlanResult | null> {
  try {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('plan_type')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    if (data?.plan_type && isValidPlan(data.plan_type)) {
      return data.plan_type;
    }
  } catch {
    // Silencioso - fallback para próxima camada
  }
  return null;
}

/**
 * Determina o plano do pagamento com 3 camadas de segurança:
 * 1. Parse estruturado do externalReference (fonte primária)
 * 2. Consulta ao banco de dados (fallback seguro)
 * 3. Análise da description (último recurso)
 */
async function getPlanFromPayment(payment: AsaasPayment): Promise<PlanResult> {
  // 1. externalReference (mais confiável - setado no checkout)
  const fromRef = parsePlanFromReference(payment.externalReference);
  if (fromRef) {
    logger.debug('[Asaas Webhook] Plano detectado via externalReference', { plan: fromRef });
    return fromRef;
  }

  // 2. Banco de dados (salvo durante o checkout)
  const fromDb = await getPlanFromDatabase(payment.id);
  if (fromDb) {
    logger.debug('[Asaas Webhook] Plano detectado via banco de dados', { plan: fromDb });
    return fromDb;
  }

  // 3. Description (fallback textual)
  const fromDesc = parsePlanFromDescription(payment.description);
  if (fromDesc) {
    logger.warn('[Asaas Webhook] Plano detectado via description (externalReference ausente)', { plan: fromDesc, paymentId: payment.id });
    return fromDesc;
  }

  // Nenhuma fonte encontrou - logar para investigação
  logger.error('[Asaas Webhook] Não foi possível determinar plano do pagamento. Usando ink como fallback', { paymentId: payment.id, externalReference: payment.externalReference, description: payment.description, value: payment.value });
  return 'ink';
}

/**
 * Extrai o plano de uma assinatura usando externalReference ou description.
 */
function getPlanFromSubscription(subscription: AsaasSubscription): PlanResult {
  const fromRef = parsePlanFromReference(subscription.externalReference);
  if (fromRef) return fromRef;

  const fromDesc = parsePlanFromDescription(subscription.description);
  if (fromDesc) return fromDesc;

  logger.warn('[Asaas Webhook] Plano não identificado na assinatura. Usando ink como fallback', { subscriptionId: subscription.id });
  return 'ink';
}
