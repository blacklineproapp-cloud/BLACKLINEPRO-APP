/**
 * Asaas Subscription API
 *
 * Obtém detalhes da assinatura do usuário no Asaas
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasSubscriptionService, AsaasCustomerService } from '@/lib/asaas';

export async function GET(req: Request) {
  try {
    // 1. Autenticação
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, is_paid, subscription_status, asaas_customer_id, asaas_subscription_id, subscription_expires_at, grace_period_until')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Se não tem assinatura Asaas
    if (!user.asaas_subscription_id) {
      return NextResponse.json({
        hasSubscription: false,
        plan: user.plan,
        status: user.subscription_status,
        isPaid: user.is_paid,
      });
    }

    // 3. Buscar assinatura no Asaas
    const subscription = await AsaasSubscriptionService.getById(user.asaas_subscription_id);

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        plan: user.plan,
        status: 'not_found',
        error: 'Assinatura não encontrada no Asaas',
      });
    }

    // 4. Buscar próxima cobrança
    const payments = await AsaasSubscriptionService.getPayments(subscription.id);
    const pendingPayment = payments.data.find((p: any) => p.status === 'PENDING');
    const lastPaidPayment = payments.data.find((p: any) =>
      ['RECEIVED', 'CONFIRMED'].includes(p.status)
    );

    // 5. Formatar resposta
    return NextResponse.json({
      hasSubscription: true,
      plan: user.plan,
      isPaid: user.is_paid,

      // Status
      status: subscription.status,
      statusLabel: getStatusLabel(subscription.status),
      subscriptionStatus: user.subscription_status,

      // Datas
      nextDueDate: subscription.nextDueDate,
      expiresAt: user.subscription_expires_at,
      gracePeriodUntil: user.grace_period_until,

      // Valores
      value: subscription.value,
      cycle: subscription.cycle,
      cycleLabel: getCycleLabel(subscription.cycle),

      // Método de pagamento
      billingType: subscription.billingType,
      billingTypeLabel: getBillingTypeLabel(subscription.billingType),

      // Cartão (se aplicável)
      creditCard: subscription.creditCard ? {
        brand: subscription.creditCard.creditCardBrand,
        lastDigits: subscription.creditCard.creditCardNumber,
      } : null,

      // Próxima cobrança pendente
      pendingPayment: pendingPayment ? {
        id: pendingPayment.id,
        value: pendingPayment.value,
        dueDate: pendingPayment.dueDate,
        invoiceUrl: pendingPayment.invoiceUrl,
        bankSlipUrl: pendingPayment.bankSlipUrl,
        billingType: pendingPayment.billingType,
      } : null,

      // Último pagamento
      lastPayment: lastPaidPayment ? {
        id: lastPaidPayment.id,
        value: lastPaidPayment.value,
        paymentDate: lastPaidPayment.paymentDate,
      } : null,

      // IDs
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

  } catch (error: any) {
    console.error('[Asaas Subscription] Erro:', error);
    return NextResponse.json({
      error: error.message || 'Erro ao buscar assinatura',
    }, { status: 500 });
  }
}

/**
 * PUT - Atualizar método de pagamento
 */
export async function PUT(req: Request) {
  try {
    // 1. Autenticação
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, asaas_subscription_id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user || !user.asaas_subscription_id) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    // 3. Parse do request
    const body = await req.json();
    const { billingType, creditCard, creditCardHolderInfo } = body;

    // 4. Atualizar no Asaas
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

  } catch (error: any) {
    console.error('[Asaas Subscription] Erro ao atualizar:', error);
    return NextResponse.json({
      error: error.message || 'Erro ao atualizar assinatura',
    }, { status: 500 });
  }
}

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
