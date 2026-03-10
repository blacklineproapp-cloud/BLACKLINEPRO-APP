/**
 * Asaas Invoices API
 *
 * Lista faturas/cobranças do usuário no Asaas
 */

import { NextResponse } from 'next/server';
import { AsaasPaymentService } from '@/lib/asaas';
import { withAuth } from '@/lib/api-middleware';

export const GET = withAuth(async (req, { userId, user }) => {
  if (!user.asaas_customer_id) {
    return NextResponse.json({ invoices: [], total: 0, hasMore: false });
  }

  try {
    // Buscar pagamentos do cliente no Asaas
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const payments = await AsaasPaymentService.list({
      customer: user.asaas_customer_id as string,
      status: status || undefined,
      limit,
    });

    // Formatar resposta
    const invoices = (payments.data || []).map((payment: any) => ({
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
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      pixTransaction: payment.pixTransaction,
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
    console.error('[Invoices] Erro ao buscar faturas:', error.message);
    return NextResponse.json({ invoices: [], total: 0, hasMore: false, error: error.message });
  }
});

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
