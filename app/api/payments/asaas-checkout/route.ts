/**
 * Asaas Checkout API
 *
 * Cria assinaturas ou cobranças avulsas no Asaas
 * Suporta: PIX, Boleto, Cartão de Crédito
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/ratelimit';
import {
  AsaasCustomerService,
  AsaasSubscriptionService,
  AsaasPaymentService,
  ASAAS_PLANS,
  BILLING_CYCLE_MAP,
} from '@/lib/asaas';
import type {
  CreditCardData,
  CreditCardHolderInfo,
  AsaasBillingType,
} from '@/lib/asaas';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CheckoutRequest {
  plan: 'ink' | 'pro' | 'studio';
  cycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  paymentMethod: 'pix' | 'boleto' | 'credit_card';
  creditCard?: CreditCardData;
  creditCardHolderInfo?: CreditCardHolderInfo;
  cpfCnpj?: string;
  phone?: string;
}

export const POST = withAuth(async (req, { userId, user }) => {
  logger.info('[Payments] Iniciando checkout', { userId });

  // Rate Limiting - máximo 5 tentativas por hora por usuário
  const rateLimitResult = await rateLimit(`checkout:${userId}`, 5, 3600);
  if (!rateLimitResult.success) {
    logger.warn('[Payments] Rate limit excedido', { userId });
    return NextResponse.json({
      error: 'Muitas tentativas. Aguarde uma hora antes de tentar novamente.',
      retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
    }, { status: 429 });
  }

  // Parse do request
  const body: CheckoutRequest = await req.json();
  const { plan, cycle, paymentMethod, creditCard, creditCardHolderInfo, cpfCnpj, phone } = body;

  // Validar plano
  const planConfig = ASAAS_PLANS[plan];
  if (!planConfig) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
  }

  // Calcular valor
  const value = planConfig.prices[cycle] || planConfig.prices.monthly;

  // Validar CPF/CNPJ (obrigatório do request)
  if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
    return NextResponse.json({
      error: 'CPF/CNPJ obrigatório',
      requiresCpf: true,
    }, { status: 400 });
  }

  // Validar telefone (recomendado mas não obrigatório)
  const validPhone = phone && phone.replace(/\D/g, '').length >= 10 ? phone : undefined;

  // Buscar ou criar customer no Asaas
  const { asaasCustomer, dbCustomer } = await AsaasCustomerService.findOrCreate({
    userId: user.id,
    clerkId: userId,
    email: user.email,
    name: user.name || user.email.split('@')[0],
    cpfCnpj: cpfCnpj,
    phone: validPhone,
  });

  // Guardar ID da assinatura anterior para cancelar DEPOIS de criar a nova
  const previousSubscriptionId = user.asaas_subscription_id;

  // Criar nova assinatura baseado no método de pagamento
  const externalReference = `${user.id}_${plan}_${cycle}`;
  const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';

  let result: any;
  let newSubscriptionId: string | null = null;

  switch (paymentMethod) {
    // PIX
    case 'pix': {
      const pixSubscription = await AsaasSubscriptionService.createWithPix({
        customerId: asaasCustomer.id,
        plan,
        cycle,
        externalReference,
      });

      newSubscriptionId = pixSubscription.id;

      const pixPayments = await AsaasSubscriptionService.getPayments(pixSubscription.id);
      const firstPixPayment = pixPayments.data[0];

      if (!firstPixPayment) {
        logger.error('[Payments] Nenhuma cobrança gerada para assinatura PIX', null, { subscriptionId: pixSubscription.id });
        try { await AsaasSubscriptionService.cancel(pixSubscription.id); } catch {}
        return NextResponse.json({
          error: 'Erro ao gerar cobrança PIX. Tente novamente.',
        }, { status: 500 });
      }

      const pixQrCode = await AsaasPaymentService.getPixQrCode(firstPixPayment.id);

      await AsaasSubscriptionService.saveToDatabase({
        userId: user.id,
        customerId: dbCustomer.id,
        subscription: pixSubscription,
        plan,
      });

      await supabaseAdmin.from('users').update({
        asaas_customer_id: asaasCustomer.id,
        asaas_subscription_id: pixSubscription.id,
        plan,
        subscription_status: 'pending',
        subscription_expires_at: pixSubscription.nextDueDate,
      }).eq('id', user.id);

      result = {
        success: true,
        method: 'pix',
        subscriptionId: pixSubscription.id,
        paymentId: firstPixPayment.id,
        pixQrCode: {
          encodedImage: pixQrCode.encodedImage,
          payload: pixQrCode.payload,
          expirationDate: pixQrCode.expirationDate,
        },
        value,
        message: 'QR Code PIX gerado com sucesso',
      };
      break;
    }

    // BOLETO
    case 'boleto': {
      const subscription = await AsaasSubscriptionService.createWithBoleto({
        customerId: asaasCustomer.id,
        plan,
        cycle,
        externalReference,
      });

      newSubscriptionId = subscription.id;

      const payments = await AsaasSubscriptionService.getPayments(subscription.id);
      const firstPayment = payments.data[0];

      await AsaasSubscriptionService.saveToDatabase({
        userId: user.id,
        customerId: dbCustomer.id,
        subscription,
        plan,
      });

      await supabaseAdmin.from('users').update({
        asaas_customer_id: asaasCustomer.id,
        asaas_subscription_id: subscription.id,
        plan,
        subscription_status: 'pending',
        subscription_expires_at: subscription.nextDueDate,
      }).eq('id', user.id);

      result = {
        success: true,
        method: 'boleto',
        subscriptionId: subscription.id,
        paymentId: firstPayment?.id,
        boletoUrl: firstPayment?.bankSlipUrl || firstPayment?.invoiceUrl,
        invoiceUrl: firstPayment?.invoiceUrl,
        dueDate: firstPayment?.dueDate,
        value,
        message: 'Boleto gerado com sucesso',
      };
      break;
    }

    // CARTÃO DE CRÉDITO
    case 'credit_card': {
      if (!creditCard || !creditCardHolderInfo) {
        return NextResponse.json({
          error: 'Dados do cartão obrigatórios',
        }, { status: 400 });
      }

      const subscription = await AsaasSubscriptionService.createWithCreditCard({
        customerId: asaasCustomer.id,
        plan,
        cycle,
        creditCard,
        creditCardHolderInfo,
        externalReference,
      });

      newSubscriptionId = subscription.id;

      await AsaasSubscriptionService.saveToDatabase({
        userId: user.id,
        customerId: dbCustomer.id,
        subscription,
        plan,
      });

      const payments = await AsaasSubscriptionService.getPayments(subscription.id);
      const firstPayment = payments.data[0];

      if (subscription.status === 'ACTIVE' || firstPayment?.status === 'CONFIRMED') {
        await supabaseAdmin.from('users').update({
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: subscription.id,
          plan,
          is_paid: true,
          subscription_status: 'active',
          subscription_expires_at: subscription.nextDueDate,
          tools_unlocked: plan === 'pro' || plan === 'studio',
        }).eq('id', user.id);
      } else {
        await supabaseAdmin.from('users').update({
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: subscription.id,
          plan,
          subscription_status: 'pending',
        }).eq('id', user.id);
      }

      result = {
        success: true,
        method: 'credit_card',
        subscriptionId: subscription.id,
        status: subscription.status,
        creditCardBrand: subscription.creditCard?.creditCardBrand,
        creditCardLastDigits: subscription.creditCard?.creditCardNumber,
        value,
        nextDueDate: subscription.nextDueDate,
        message: subscription.status === 'ACTIVE'
          ? 'Assinatura ativada com sucesso!'
          : 'Processando pagamento...',
      };
      break;
    }

    default:
      return NextResponse.json({
        error: 'Método de pagamento inválido',
      }, { status: 400 });
  }

  // Cancelar assinatura anterior DEPOIS que a nova foi criada com sucesso
  if (previousSubscriptionId && previousSubscriptionId !== newSubscriptionId) {
    try {
      logger.info('[Payments] Cancelando assinatura anterior', { previousSubscriptionId });
      await AsaasSubscriptionService.cancel(previousSubscriptionId);
    } catch (cancelError: any) {
      logger.warn('[Payments] Erro ao cancelar assinatura anterior (pode já estar inativa)', { error: cancelError.message });
    }
  }

  return NextResponse.json(result);
});

/**
 * GET - Verificar status de um pagamento
 */
export const GET = withAuth(async (req, { userId, user }) => {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 });
  }

  const payment = await AsaasPaymentService.getById(paymentId);

  if (!payment) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
  }

  // Verificar se o pagamento pertence ao usuário
  const { data: dbCustomer } = await supabaseAdmin
    .from('customers')
    .select('asaas_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!dbCustomer || payment.customer !== dbCustomer.asaas_customer_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // Se for PIX, buscar QR Code
  let pixQrCode = null;
  if (payment.billingType === 'PIX' && payment.status === 'PENDING') {
    try {
      pixQrCode = await AsaasPaymentService.getPixQrCode(paymentId);
    } catch (e) {
      // QR Code pode não estar disponível
    }
  }

  return NextResponse.json({
    id: payment.id,
    status: payment.status,
    value: payment.value,
    billingType: payment.billingType,
    dueDate: payment.dueDate,
    paymentDate: payment.paymentDate,
    invoiceUrl: payment.invoiceUrl,
    bankSlipUrl: payment.bankSlipUrl,
    pixQrCode,
    isPaid: ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status),
  });
});
