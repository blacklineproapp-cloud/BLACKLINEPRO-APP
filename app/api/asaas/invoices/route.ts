/**
 * Asaas Invoices API
 *
 * Lista faturas/cobranças do usuário no Asaas
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasPaymentService } from '@/lib/asaas';

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
      .select('id, asaas_customer_id, asaas_subscription_id')
      .eq('clerk_id', clerkId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!user.asaas_customer_id) {
      return NextResponse.json({ invoices: [], message: 'Nenhuma fatura encontrada' });
    }

    // 3. Buscar pagamentos do cliente no Asaas
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // PENDING, RECEIVED, OVERDUE, etc
    const limit = parseInt(searchParams.get('limit') || '20');

    const payments = await AsaasPaymentService.list({
      customer: user.asaas_customer_id,
      status: status || undefined,
      limit,
    });

    // 4. Formatar resposta
    const invoices = payments.data.map((payment: any) => ({
      id: payment.id,
      status: payment.status,
      statusLabel: getStatusLabel(payment.status),
      value: payment.value,
      netValue: payment.netValue,
      billingType: payment.billingType,
      billingTypeLabel: getBillingTypeLabel(payment.billingType),
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate,
      description: payment.description,
      // URLs
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      // PIX
      pixTransaction: payment.pixTransaction,
      // Flags
      isPaid: ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status),
      isOverdue: payment.status === 'OVERDUE',
      isPending: payment.status === 'PENDING',
    }));

    return NextResponse.json({
      invoices,
      total: payments.totalCount || invoices.length,
      hasMore: payments.hasMore || false,
    });

  } catch (error: any) {
    console.error('[Asaas Invoices] Erro:', error);
    return NextResponse.json({
      error: error.message || 'Erro ao buscar faturas',
    }, { status: 500 });
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    RECEIVED: 'Pago',
    CONFIRMED: 'Confirmado',
    OVERDUE: 'Vencido',
    REFUNDED: 'Estornado',
    RECEIVED_IN_CASH: 'Pago em dinheiro',
    REFUND_REQUESTED: 'Estorno solicitado',
    REFUND_IN_PROGRESS: 'Estorno em andamento',
    CHARGEBACK_REQUESTED: 'Chargeback solicitado',
    CHARGEBACK_DISPUTE: 'Chargeback em disputa',
    AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão',
    DUNNING_REQUESTED: 'Cobrança solicitada',
    DUNNING_RECEIVED: 'Cobrança recebida',
    AWAITING_RISK_ANALYSIS: 'Em análise',
  };
  return labels[status] || status;
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
