/**
 * Asaas Subscription API
 *
 * Obtém detalhes da assinatura do usuário no Asaas
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasSubscriptionService } from '@/lib/asaas';
import { withAuth } from '@/lib/api-middleware';

export const GET = withAuth(async (req, { userId, user }) => {
  // Se não tem assinatura Asaas
  if (!user.asaas_subscription_id) {
    return NextResponse.json({
      hasSubscription: false,
      plan: user.plan,
      status: user.subscription_status,
      isPaid: user.is_paid,
    });
  }

  // Buscar assinatura no Asaas
  const subscription = await AsaasSubscriptionService.getById(user.asaas_subscription_id);

  if (!subscription) {
    return NextResponse.json({
      hasSubscription: false,
      plan: user.plan,
      status: 'not_found',
      error: 'Assinatura não encontrada no Asaas',
    });
  }

  // Buscar próxima cobrança
  const payments = await AsaasSubscriptionService.getPayments(subscription.id);
  const pendingPayment = payments.data.find((p: any) => p.status === 'PENDING');
  const lastPaidPayment = payments.data.find((p: any) =>
    ['RECEIVED', 'CONFIRMED'].includes(p.status)
  );

  // Formatar resposta
  return NextResponse.json({
    hasSubscription: true,
    plan: user.plan,
    isPaid: user.is_paid,
    status: subscription.status,
    statusLabel: getStatusLabel(subscription.status),
    subscriptionStatus: user.subscription_status,
    nextDueDate: subscription.nextDueDate,
    expiresAt: user.subscription_expires_at,
    gracePeriodUntil: user.grace_period_until,
    value: subscription.value,
    cycle: subscription.cycle,
    cycleLabel: getCycleLabel(subscription.cycle),
    billingType: subscription.billingType,
    billingTypeLabel: getBillingTypeLabel(subscription.billingType),
    creditCard: subscription.creditCard ? {
      brand: subscription.creditCard.creditCardBrand,
      lastDigits: subscription.creditCard.creditCardNumber,
    } : null,
    pendingPayment: pendingPayment ? {
      id: pendingPayment.id,
      value: pendingPayment.value,
      dueDate: pendingPayment.dueDate,
      invoiceUrl: pendingPayment.invoiceUrl,
      bankSlipUrl: pendingPayment.bankSlipUrl,
      billingType: pendingPayment.billingType,
    } : null,
    lastPayment: lastPaidPayment ? {
      id: lastPaidPayment.id,
      value: lastPaidPayment.value,
      paymentDate: lastPaidPayment.paymentDate,
    } : null,
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });
});

/**
 * PUT - Atualizar método de pagamento
 */
export const PUT = withAuth(async (req, { userId, user }) => {
  if (!user.asaas_subscription_id) {
    return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
  }

  const body = await req.json();
  const { billingType, creditCard, creditCardHolderInfo } = body;

  const updateData: any = {};

  if (billingType) {
    updateData.billingType = billingType;
  }

  if (creditCard && creditCardHolderInfo) {
    updateData.creditCard = creditCard;
    updateData.creditCardHolderInfo = creditCardHolderInfo;
  }

  const updated = await AsaasSubscriptionService.update(
    user.asaas_subscription_id,
    updateData
  );

  return NextResponse.json({
    success: true,
    message: 'Método de pagamento atualizado',
    billingType: updated.billingType,
  });
});

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Ativa',
    INACTIVE: 'Inativa',
    EXPIRED: 'Expirada',
  };
  return labels[status] || status;
}

function getCycleLabel(cycle: string): string {
  const labels: Record<string, string> = {
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quinzenal',
    MONTHLY: 'Mensal',
    QUARTERLY: 'Trimestral',
    SEMIANNUALLY: 'Semestral',
    YEARLY: 'Anual',
  };
  return labels[cycle] || cycle;
}

function getBillingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BOLETO: 'Boleto',
    CREDIT_CARD: 'Cartão de Crédito',
    PIX: 'PIX',
    UNDEFINED: 'Não definido',
  };
  return labels[type] || type;
}
