/**
 * Asaas Payment Service
 *
 * Gerenciamento de cobranças avulsas e PIX
 */

import { asaasGet, asaasPost, asaasPut, asaasDelete, getDueDate, isSandbox } from './client';
import { supabaseAdmin } from '../supabase';
import type {
  AsaasPayment,
  CreatePaymentParams,
  AsaasListResponse,
  AsaasPixQrCode,
  CreditCardData,
  CreditCardHolderInfo,
  CreditCardToken,
  TokenizeCardParams,
} from './types';
import { ASAAS_PLANS } from './types';
import { logger } from '../logger';

export class AsaasPaymentService {
  /**
   * Cria uma nova cobrança
   */
  static async create(params: CreatePaymentParams): Promise<AsaasPayment> {
    const payment = await asaasPost<AsaasPayment>('/payments', params);

    logger.info('[AsaasPayment] Cobrança criada', { paymentId: payment.id, billingType: payment.billingType, value: payment.value });

    return payment;
  }

  /**
   * Busca cobrança por ID
   */
  static async getById(paymentId: string): Promise<AsaasPayment | null> {
    try {
      return await asaasGet<AsaasPayment>(`/payments/${paymentId}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Atualiza uma cobrança
   */
  static async update(
    paymentId: string,
    params: Partial<CreatePaymentParams>
  ): Promise<AsaasPayment> {
    const payment = await asaasPut<AsaasPayment>(`/payments/${paymentId}`, params);

    logger.info('[AsaasPayment] Cobrança atualizada', { paymentId: payment.id });

    return payment;
  }

  /**
   * Remove uma cobrança
   */
  static async delete(paymentId: string): Promise<{ deleted: boolean; id: string }> {
    const result = await asaasDelete<{ deleted: boolean; id: string }>(
      `/payments/${paymentId}`
    );

    logger.info('[AsaasPayment] Cobrança removida', { paymentId });

    return result;
  }

  /**
   * Lista cobranças
   */
  static async list(params?: {
    offset?: number;
    limit?: number;
    customer?: string;
    subscription?: string;
    billingType?: string;
    status?: string;
    externalReference?: string;
  }): Promise<AsaasListResponse<AsaasPayment>> {
    return asaasGet<AsaasListResponse<AsaasPayment>>('/payments', params);
  }

  // ============================================================================
  // PIX
  // ============================================================================

  /**
   * Cria cobrança PIX e retorna QR Code
   */
  static async createPixPayment(params: {
    customerId: string;
    value: number;
    description?: string;
    externalReference?: string;
    dueDate?: string;
  }): Promise<{ payment: AsaasPayment; pixQrCode: AsaasPixQrCode }> {
    const { customerId, value, description, externalReference, dueDate } = params;

    // 1. Criar cobrança PIX
    const payment = await this.create({
      customer: customerId,
      billingType: 'PIX',
      value,
      dueDate: dueDate || getDueDate(1), // Vence em 1 dia por padrão
      description: description || 'Pagamento via PIX',
      externalReference,
    });

    // 2. Buscar QR Code
    const pixQrCode = await this.getPixQrCode(payment.id);

    return { payment, pixQrCode };
  }

  /**
   * Busca QR Code PIX de uma cobrança
   */
  static async getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
    return asaasGet<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
  }

  /**
   * Cria cobrança PIX para um plano específico
   */
  static async createPixForPlan(params: {
    customerId: string;
    plan: string;
    cycle: string;
    externalReference?: string;
  }): Promise<{ payment: AsaasPayment; pixQrCode: AsaasPixQrCode }> {
    const { customerId, plan, cycle, externalReference } = params;

    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    const value = planConfig.prices[cycle as keyof typeof planConfig.prices] || planConfig.prices.monthly;

    return this.createPixPayment({
      customerId,
      value,
      description: `Black Line Pro ${planConfig.name} - ${cycle}`,
      externalReference,
      dueDate: getDueDate(1),
    });
  }

  // ============================================================================
  // BOLETO
  // ============================================================================

  /**
   * Cria cobrança via Boleto
   */
  static async createBoletoPayment(params: {
    customerId: string;
    value: number;
    description?: string;
    externalReference?: string;
    dueDate?: string;
  }): Promise<AsaasPayment> {
    const { customerId, value, description, externalReference, dueDate } = params;

    return this.create({
      customer: customerId,
      billingType: 'BOLETO',
      value,
      dueDate: dueDate || getDueDate(3), // Vence em 3 dias por padrão
      description: description || 'Pagamento via Boleto',
      externalReference,
    });
  }

  /**
   * Busca linha digitável do boleto
   */
  static async getBoletoIdentificationField(paymentId: string): Promise<string> {
    const response = await asaasGet<{ identificationField: string; nossoNumero: string }>(
      `/payments/${paymentId}/identificationField`
    );
    return response.identificationField;
  }

  // ============================================================================
  // CARTÃO DE CRÉDITO
  // ============================================================================

  /**
   * Cria cobrança via Cartão de Crédito
   */
  static async createCreditCardPayment(params: {
    customerId: string;
    value: number;
    description?: string;
    externalReference?: string;
    creditCard: CreditCardData;
    creditCardHolderInfo: CreditCardHolderInfo;
    installmentCount?: number;
    installmentValue?: number;
  }): Promise<AsaasPayment> {
    const {
      customerId,
      value,
      description,
      externalReference,
      creditCard,
      creditCardHolderInfo,
      installmentCount,
      installmentValue,
    } = params;

    return this.create({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate: getDueDate(0), // Cobra imediatamente
      description: description || 'Pagamento via Cartão',
      externalReference,
      creditCard,
      creditCardHolderInfo,
      installmentCount,
      installmentValue,
    });
  }

  /**
   * Cria cobrança com token de cartão salvo
   */
  static async createCreditCardPaymentWithToken(params: {
    customerId: string;
    value: number;
    description?: string;
    externalReference?: string;
    creditCardToken: string;
  }): Promise<AsaasPayment> {
    const { customerId, value, description, externalReference, creditCardToken } = params;

    return this.create({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate: getDueDate(0),
      description: description || 'Pagamento via Cartão',
      externalReference,
      creditCardToken,
    });
  }

  /**
   * Tokeniza um cartão de crédito
   */
  static async tokenizeCard(params: TokenizeCardParams): Promise<CreditCardToken> {
    return asaasPost<CreditCardToken>('/creditCard/tokenize', params);
  }

  // ============================================================================
  // ESTORNO
  // ============================================================================

  /**
   * Estorna uma cobrança
   */
  static async refund(
    paymentId: string,
    params?: { value?: number; description?: string }
  ): Promise<AsaasPayment> {
    const payment = await asaasPost<AsaasPayment>(
      `/payments/${paymentId}/refund`,
      params || {}
    );

    logger.info('[AsaasPayment] Estorno realizado', { paymentId });

    return payment;
  }

  // ============================================================================
  // INTEGRAÇÃO COM BANCO DE DADOS
  // ============================================================================

  /**
   * Salva pagamento no banco de dados
   */
  static async saveToDatabase(params: {
    userId: string;
    customerId: string;
    payment: AsaasPayment;
    plan?: string;
    customerSource?: 'asaas_customers' | 'customers';
  }): Promise<void> {
    const { userId, customerId, payment, plan, customerSource } = params;

    logger.debug('[AsaasPayment] Preparando para salvar', { asaasPaymentId: payment.id, userId, customerId, customerSource });

    // Mapear status do Asaas para nosso sistema
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'RECEIVED': 'succeeded',
      'CONFIRMED': 'succeeded',
      'OVERDUE': 'overdue',
      'REFUNDED': 'refunded',
      'RECEIVED_IN_CASH': 'succeeded',
      'REFUND_REQUESTED': 'refund_pending',
      'REFUND_IN_PROGRESS': 'refund_pending',
      'CHARGEBACK_REQUESTED': 'disputed',
      'CHARGEBACK_DISPUTE': 'disputed',
      'AWAITING_CHARGEBACK_REVERSAL': 'disputed',
      'DUNNING_REQUESTED': 'overdue',
      'DUNNING_RECEIVED': 'overdue',
      'AWAITING_RISK_ANALYSIS': 'pending',
    };

    const paymentData: Record<string, unknown> = {
      user_id: userId,
      // CRITICO: Só passamos customer_id se tivermos CERTEZA que ele pertence à tabela customers (legado)
      // Se for nulo ou de asaas_customers, ignoramos para evitar erro de FK constraint
      customer_id: customerSource === 'customers' ? customerId : null,
      asaas_payment_id: payment.id,
      asaas_subscription_id: payment.subscription || null,
      stripe_payment_id: `asaas_${payment.id}`, 
      amount: payment.value,
      currency: 'BRL',
      status: statusMap[payment.status] || 'pending',
      payment_method: payment.billingType?.toLowerCase() || 'pix',
      description: payment.description || `Pagamento ${payment.billingType}`,
      plan_type: plan,
      invoice_url: payment.invoiceUrl || payment.bankSlipUrl,
      receipt_url: payment.transactionReceiptUrl,
      is_test: isSandbox(),
      provider: 'asaas',
      metadata: {
        asaas_status: payment.status,
        due_date: payment.dueDate,
        payment_date: payment.paymentDate,
        pix_qr_code_id: payment.pixQrCodeId,
        customer_source: customerSource,
        saved_at: new Date().toISOString()
      },
    };

    logger.debug('[AsaasPayment] Payload final para o Supabase', { paymentData });

    const { data, error } = await supabaseAdmin.from('payments').upsert(paymentData, {
      onConflict: 'asaas_payment_id',
    }).select();

    if (error) {
      logger.error('[AsaasPayment] ERRO de constraint ou banco', error);
      throw error;
    }

    if (data && data.length > 0) {
      logger.info('[AsaasPayment] Pagamento salvo com sucesso', { asaasPaymentId: payment.id, dbId: data[0].id });
    }
  }

  /**
   * Atualiza status do pagamento no banco
   */
  static async updateDatabaseStatus(
    asaasPaymentId: string,
    status: string,
    paymentDate?: string
  ): Promise<void> {
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'RECEIVED': 'succeeded',
      'CONFIRMED': 'succeeded',
      'OVERDUE': 'overdue',
      'REFUNDED': 'refunded',
    };

    const updates: Record<string, unknown> = {
      status: statusMap[status] || status.toLowerCase(),
      updated_at: new Date().toISOString(),
    };

    if (paymentDate) {
      updates.metadata = supabaseAdmin.rpc('jsonb_set', {
        target: 'metadata',
        path: ['payment_date'],
        new_value: paymentDate,
      });
    }

    await supabaseAdmin
      .from('payments')
      .update(updates)
      .eq('asaas_payment_id', asaasPaymentId);

    logger.info('[AsaasPayment] Status atualizado', { asaasPaymentId, status });
  }

  /**
   * Busca pagamento do banco por asaas_payment_id
   */
  static async getDbPaymentByAsaasId(asaasPaymentId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('asaas_payment_id', asaasPaymentId)
      .single();

    return data;
  }
}
