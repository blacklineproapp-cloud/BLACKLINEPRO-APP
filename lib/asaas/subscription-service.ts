/**
 * Asaas Subscription Service
 *
 * Gerenciamento de assinaturas recorrentes no Asaas
 */

import { asaasGet, asaasPost, asaasPut, asaasDelete, formatAsaasDate, getDueDate } from './client';
import { supabaseAdmin } from '../supabase';
import type {
  AsaasSubscription,
  CreateSubscriptionParams,
  AsaasListResponse,
  AsaasPayment,
  AsaasBillingType,
  AsaasSubscriptionCycle,
  CreditCardData,
  CreditCardHolderInfo,
} from './types';
import { BILLING_CYCLE_MAP, ASAAS_PLANS } from './types';
import { logger } from '../logger';

export class AsaasSubscriptionService {
  /**
   * Cria uma nova assinatura
   */
  static async create(params: CreateSubscriptionParams): Promise<AsaasSubscription> {
    const subscription = await asaasPost<AsaasSubscription>('/subscriptions', params);

    logger.info('[AsaasSubscription] Assinatura criada', { subscriptionId: subscription.id, billingType: subscription.billingType });

    return subscription;
  }

  /**
   * Busca assinatura por ID
   */
  static async getById(subscriptionId: string): Promise<AsaasSubscription | null> {
    try {
      return await asaasGet<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca assinaturas de um cliente
   */
  static async getByCustomerId(customerId: string): Promise<AsaasSubscription[]> {
    try {
      const response = await asaasGet<AsaasListResponse<AsaasSubscription>>('/subscriptions', {
        customer: customerId,
      });

      return response.data;
    } catch (error) {
      return [];
    }
  }

  /**
   * Busca assinatura ativa de um cliente
   */
  static async getActiveByCustomerId(customerId: string): Promise<AsaasSubscription | null> {
    try {
      const response = await asaasGet<AsaasListResponse<AsaasSubscription>>('/subscriptions', {
        customer: customerId,
        status: 'ACTIVE',
      });

      return response.data[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Atualiza uma assinatura
   */
  static async update(
    subscriptionId: string,
    params: Partial<CreateSubscriptionParams>
  ): Promise<AsaasSubscription> {
    const subscription = await asaasPut<AsaasSubscription>(
      `/subscriptions/${subscriptionId}`,
      params
    );

    logger.info('[AsaasSubscription] Assinatura atualizada', { subscriptionId: subscription.id });

    return subscription;
  }

  /**
   * Cancela uma assinatura
   */
  static async cancel(subscriptionId: string): Promise<AsaasSubscription> {
    const subscription = await asaasDelete<AsaasSubscription>(
      `/subscriptions/${subscriptionId}`
    );

    logger.info('[AsaasSubscription] Assinatura cancelada', { subscriptionId });

    return subscription;
  }

  /**
   * Lista cobranças de uma assinatura
   */
  static async getPayments(
    subscriptionId: string,
    params?: { status?: string; offset?: number; limit?: number }
  ): Promise<AsaasListResponse<AsaasPayment>> {
    return asaasGet<AsaasListResponse<AsaasPayment>>(
      `/subscriptions/${subscriptionId}/payments`,
      params
    );
  }

  /**
   * Lista todas as assinaturas
   */
  static async list(params?: {
    offset?: number;
    limit?: number;
    customer?: string;
    billingType?: AsaasBillingType;
    status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    externalReference?: string;
  }): Promise<AsaasListResponse<AsaasSubscription>> {
    return asaasGet<AsaasListResponse<AsaasSubscription>>('/subscriptions', params);
  }

  // ============================================================================
  // CRIAÇÃO DE ASSINATURAS POR TIPO DE PLANO
  // ============================================================================

  /**
   * Cria assinatura com BOLETO
   */
  static async createWithBoleto(params: {
    customerId: string;
    plan: string;
    cycle: string;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    const { customerId, plan, cycle, externalReference } = params;

    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';
    const value = planConfig.prices[cycle as keyof typeof planConfig.prices] || planConfig.prices.monthly;

    return this.create({
      customer: customerId,
      billingType: 'BOLETO',
      value,
      nextDueDate: getDueDate(0), // Vence hoje (gera boleto imediatamente)
      cycle: asaasCycle,
      description: `Black Line Pro ${planConfig.name} - ${cycle}`,
      externalReference,
    });
  }

  /**
   * Cria assinatura com PIX
   */
  static async createWithPix(params: {
    customerId: string;
    plan: string;
    cycle: string;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    const { customerId, plan, cycle, externalReference } = params;

    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';
    const value = planConfig.prices[cycle as keyof typeof planConfig.prices] || planConfig.prices.monthly;

    return this.create({
      customer: customerId,
      billingType: 'PIX',
      value,
      nextDueDate: getDueDate(0), // Vence hoje
      cycle: asaasCycle,
      description: `Black Line Pro ${planConfig.name} - ${cycle}`,
      externalReference,
    });
  }

  /**
   * Cria assinatura com CARTÃO DE CRÉDITO
   */
  static async createWithCreditCard(params: {
    customerId: string;
    plan: string;
    cycle: string;
    creditCard: CreditCardData;
    creditCardHolderInfo: CreditCardHolderInfo;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    const { customerId, plan, cycle, creditCard, creditCardHolderInfo, externalReference } = params;

    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';
    const value = planConfig.prices[cycle as keyof typeof planConfig.prices] || planConfig.prices.monthly;

    return this.create({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      nextDueDate: getDueDate(0), // Cobra imediatamente
      cycle: asaasCycle,
      description: `Black Line Pro ${planConfig.name} - ${cycle}`,
      externalReference,
      creditCard,
      creditCardHolderInfo,
    });
  }

  /**
   * Cria assinatura com TOKEN de cartão (cartão já salvo)
   */
  static async createWithCreditCardToken(params: {
    customerId: string;
    plan: string;
    cycle: string;
    creditCardToken: string;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    const { customerId, plan, cycle, creditCardToken, externalReference } = params;

    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';
    const value = planConfig.prices[cycle as keyof typeof planConfig.prices] || planConfig.prices.monthly;

    return this.create({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      nextDueDate: getDueDate(0),
      cycle: asaasCycle,
      description: `Black Line Pro ${planConfig.name} - ${cycle}`,
      externalReference,
      creditCardToken,
    });
  }

  /**
   * Cria assinatura com método UNDEFINED (cliente escolhe no checkout)
   */
  static async createWithUndefined(params: {
    customerId: string;
    plan: string;
    cycle: string;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    const { customerId, plan, cycle, externalReference } = params;

    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      throw new Error(`Plano inválido: ${plan}`);
    }

    const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';
    const value = planConfig.prices[cycle as keyof typeof planConfig.prices] || planConfig.prices.monthly;

    return this.create({
      customer: customerId,
      billingType: 'UNDEFINED', // Cliente escolhe
      value,
      nextDueDate: getDueDate(3), // 3 dias para pagar
      cycle: asaasCycle,
      description: `Black Line Pro ${planConfig.name} - ${cycle}`,
      externalReference,
    });
  }

  // ============================================================================
  // INTEGRAÇÃO COM BANCO DE DADOS
  // ============================================================================

  /**
   * Salva assinatura no banco de dados
   */
  static async saveToDatabase(params: {
    userId: string;
    customerId: string;
    subscription: AsaasSubscription;
    plan: string;
    customerSource?: 'asaas_customers' | 'customers';
  }): Promise<void> {
    const { userId, customerId, subscription, plan, customerSource } = params;

    // 1. Salvar na tabela subscriptions
    // Se for da tabela asaas_customers, não passamos customer_id (UUID legado)
    // para evitar erro FK constraint.
    await supabaseAdmin.from('subscriptions').upsert({
      customer_id: customerSource === 'customers' ? customerId : null,
      asaas_subscription_id: subscription.id,
      asaas_customer_id: subscription.customer, // Salvar o ID textual do Asaas também
      status: subscription.status.toLowerCase(),
      current_period_start: subscription.dateCreated,
      current_period_end: subscription.nextDueDate,
      metadata: {
        plan,
        cycle: subscription.cycle,
        billingType: subscription.billingType,
        value: subscription.value,
        customer_source: customerSource,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'asaas_subscription_id',
    });

    // 2. Atualizar usuário
    await supabaseAdmin.from('users').update({
      asaas_subscription_id: subscription.id,
      subscription_status: subscription.status.toLowerCase(),
      plan,
      // Não ativar is_paid ainda - aguardar confirmação de pagamento
    }).eq('id', userId);

    logger.info('[AsaasSubscription] Assinatura salva no banco', { subscriptionId: subscription.id });
  }

  /**
   * Sincroniza assinatura do Asaas com banco
   */
  static async syncFromAsaas(subscriptionId: string): Promise<void> {
    const subscription = await this.getById(subscriptionId);
    if (!subscription) {
      logger.warn('[AsaasSubscription] Assinatura não encontrada', { subscriptionId });
      return;
    }

    // Buscar customer no banco
    const { data: dbCustomer } = await supabaseAdmin
      .from('customers')
      .select('id, user_id')
      .eq('asaas_customer_id', subscription.customer)
      .single();

    if (!dbCustomer) {
      logger.warn('[AsaasSubscription] Customer não encontrado no banco', { asaasCustomerId: subscription.customer });
      return;
    }

    // Atualizar tabela subscriptions
    await supabaseAdmin.from('subscriptions').upsert({
      customer_id: dbCustomer.id,
      asaas_subscription_id: subscription.id,
      status: subscription.status.toLowerCase(),
      current_period_end: subscription.nextDueDate,
      metadata: {
        cycle: subscription.cycle,
        billingType: subscription.billingType,
        value: subscription.value,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'asaas_subscription_id',
    });

    // Atualizar status do usuário
    const isActive = subscription.status === 'ACTIVE';
    await supabaseAdmin.from('users').update({
      subscription_status: subscription.status.toLowerCase(),
      is_paid: isActive,
    }).eq('asaas_subscription_id', subscription.id);

    logger.info('[AsaasSubscription] Sincronizado', { subscriptionId: subscription.id, status: subscription.status });
  }

  /**
   * Busca assinatura do banco por user_id
   */
  static async getDbSubscriptionByUserId(userId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('asaas_subscription_id')
      .eq('id', userId)
      .single();

    if (!data?.asaas_subscription_id) {
      return null;
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('asaas_subscription_id', data.asaas_subscription_id)
      .single();

    return subscription;
  }
}
