/**
 * Asaas Types - Definições TypeScript completas
 *
 * Documentação: https://docs.asaas.com/reference/comece-por-aqui
 */

// ============================================================================
// BILLING TYPES (Métodos de Pagamento)
// ============================================================================

export type AsaasBillingType =
  | 'BOLETO'
  | 'CREDIT_CARD'
  | 'PIX'
  | 'UNDEFINED'; // Permite cliente escolher

// ============================================================================
// SUBSCRIPTION CYCLES (Ciclos de Cobrança)
// ============================================================================

export type AsaasSubscriptionCycle =
  | 'WEEKLY'        // Semanal
  | 'BIWEEKLY'      // Quinzenal
  | 'MONTHLY'       // Mensal
  | 'QUARTERLY'     // Trimestral
  | 'SEMIANNUALLY'  // Semestral
  | 'YEARLY';       // Anual

// Mapeamento do nosso sistema para Asaas
export const BILLING_CYCLE_MAP: Record<string, AsaasSubscriptionCycle> = {
  'monthly': 'MONTHLY',
  'quarterly': 'QUARTERLY',
  'semiannual': 'SEMIANNUALLY',
  'yearly': 'YEARLY',
};

// ============================================================================
// PAYMENT STATUS
// ============================================================================

export type AsaasPaymentStatus =
  | 'PENDING'                    // Aguardando pagamento
  | 'RECEIVED'                   // Recebido (saldo já creditado)
  | 'CONFIRMED'                  // Confirmado (saldo ainda não disponível)
  | 'OVERDUE'                    // Vencido
  | 'REFUNDED'                   // Estornado
  | 'RECEIVED_IN_CASH'           // Recebido em dinheiro
  | 'REFUND_REQUESTED'           // Estorno solicitado
  | 'REFUND_IN_PROGRESS'         // Estorno em processamento
  | 'CHARGEBACK_REQUESTED'       // Chargeback solicitado
  | 'CHARGEBACK_DISPUTE'         // Em disputa de chargeback
  | 'AWAITING_CHARGEBACK_REVERSAL' // Aguardando reversão de chargeback
  | 'DUNNING_REQUESTED'          // Negativação solicitada
  | 'DUNNING_RECEIVED'           // Negativação recebida
  | 'AWAITING_RISK_ANALYSIS';    // Aguardando análise de risco

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

export type AsaasSubscriptionStatus =
  | 'ACTIVE'    // Ativa
  | 'INACTIVE'  // Inativa
  | 'EXPIRED';  // Expirada

// ============================================================================
// CUSTOMER
// ============================================================================

export interface AsaasCustomer {
  id: string;
  object: 'customer';
  dateCreated: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: number;
  cityName?: string;
  state?: string;
  country?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
  groupName?: string;
  company?: string;
  deleted: boolean;
}

export interface CreateCustomerParams {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string; // clerk_id ou user_id
  notificationDisabled?: boolean;
  additionalEmails?: string;
  groupName?: string;
  company?: string;
}

// ============================================================================
// PAYMENT (Cobrança)
// ============================================================================

export interface AsaasPayment {
  id: string;
  object: 'payment';
  dateCreated: string;
  customer: string;
  subscription?: string;
  installment?: string;
  paymentLink?: string;
  dueDate: string;
  originalDueDate?: string;
  value: number;
  netValue?: number;
  originalValue?: number;
  interestValue?: number;
  description?: string;
  externalReference?: string;
  billingType: AsaasBillingType;
  status: AsaasPaymentStatus;
  pixTransaction?: string;
  confirmedDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  creditDate?: string;
  estimatedCreditDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  invoiceNumber?: string;
  deleted: boolean;
  anticipated: boolean;
  anticipable: boolean;
  lastInvoiceViewedDate?: string;
  lastBankSlipViewedDate?: string;
  postalService?: boolean;
  // PIX específico
  pixQrCodeId?: string;
  // Cartão específico
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken: string;
  };
  // Desconto
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  // Multa
  fine?: {
    value: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  // Juros
  interest?: {
    value: number;
  };
  // Split
  split?: AsaasSplit[];
}

export interface CreatePaymentParams {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  fine?: {
    value: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
  };
  postalService?: boolean;
  // Para cartão de crédito
  creditCard?: CreditCardData;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  // Callback URLs
  callback?: {
    successUrl?: string;
    autoRedirect?: boolean;
  };
}

// ============================================================================
// SUBSCRIPTION (Assinatura)
// ============================================================================

export interface AsaasSubscription {
  id: string;
  object: 'subscription';
  dateCreated: string;
  customer: string;
  paymentLink?: string;
  value: number;
  nextDueDate: string;
  cycle: AsaasSubscriptionCycle;
  description?: string;
  billingType: AsaasBillingType;
  status: AsaasSubscriptionStatus;
  deleted: boolean;
  // Desconto
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  // Multa
  fine?: {
    value: number;
    type: 'FIXED' | 'PERCENTAGE';
  };
  // Juros
  interest?: {
    value: number;
  };
  // Cartão de crédito
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    creditCardToken: string;
  };
  // Split
  split?: AsaasSplit[];
  // Campos extras
  externalReference?: string;
  sendPaymentByPostalService?: boolean;
  endDate?: string;
  maxPayments?: number;
}

export interface CreateSubscriptionParams {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD - Primeira cobrança
  cycle: AsaasSubscriptionCycle;
  description?: string;
  externalReference?: string;
  // Desconto
  discount?: {
    value: number;
    dueDateLimitDays?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  // Multa e juros
  fine?: {
    value: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value: number;
  };
  // Para limitar assinatura
  endDate?: string;
  maxPayments?: number;
  // Para cartão de crédito
  creditCard?: CreditCardData;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  // Callback URLs
  callback?: {
    successUrl?: string;
    autoRedirect?: boolean;
  };
}

// ============================================================================
// CREDIT CARD
// ============================================================================

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone?: string;
  mobilePhone?: string;
}

export interface CreditCardToken {
  creditCardNumber: string;
  creditCardBrand: string;
  creditCardToken: string;
}

export interface TokenizeCardParams {
  customer: string;
  creditCard: CreditCardData;
  creditCardHolderInfo: CreditCardHolderInfo;
}

// ============================================================================
// PIX
// ============================================================================

export interface AsaasPixQrCode {
  encodedImage: string;  // Base64 do QR Code
  payload: string;       // Código copia-e-cola
  expirationDate: string;
}

// ============================================================================
// SPLIT (Divisão de Pagamento)
// ============================================================================

export interface AsaasSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  totalFixedValue?: number;
}

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

export type AsaasWebhookEvent =
  // Pagamentos
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
  | 'PAYMENT_ANTICIPATED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED'
  | 'PAYMENT_REFUND_IN_PROGRESS'
  | 'PAYMENT_RECEIVED_IN_CASH'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_DUNNING_REQUESTED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  | 'PAYMENT_CHECKOUT_VIEWED'
  // Assinaturas
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_DELETED'
  | 'SUBSCRIPTION_INACTIVATED'
  | 'SUBSCRIPTION_PAYMENT_OVERDUE';

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface AsaasListResponse<T> {
  object: 'list';
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

export interface AsaasError {
  errors: Array<{
    code: string;
    description: string;
  }>;
}

// ============================================================================
// PLAN MAPPING (Nossos planos → Preços)
// ============================================================================

export interface PlanConfig {
  name: string;
  prices: {
    monthly: number;
    quarterly: number;
    semiannual: number;
    yearly: number;
  };
  features: string[];
}

export const ASAAS_PLANS: Record<string, PlanConfig> = {
  legacy: {
    name: 'Legacy',
    prices: {
      monthly: 25.00,
      quarterly: 75.00,
      semiannual: 150.00,
      yearly: 300.00,
    },
    features: ['Editor de Stencil', '100 gerações/mês'],
  },
  starter: {
    name: 'Starter',
    prices: {
      monthly: 50.00,
      quarterly: 135.00,    // 10% off
      semiannual: 225.00,   // 25% off
      yearly: 360.00,       // 40% off
    },
    features: ['Editor completo', 'Modo Topográfico', '95 gerações/mês'],
  },
  pro: {
    name: 'Pro',
    prices: {
      monthly: 100.00,
      quarterly: 270.00,    // 10% off
      semiannual: 450.00,   // 25% off
      yearly: 720.00,       // 40% off
    },
    features: ['Tudo do Starter', 'IA Generativa', 'Color Match', '210 gerações/mês'],
  },
  studio: {
    name: 'Studio',
    prices: {
      monthly: 300.00,
      quarterly: 810.00,    // 10% off
      semiannual: 1350.00,  // 25% off
      yearly: 2160.00,      // 40% off
    },
    features: ['Tudo do Pro', '680 gerações/mês', 'Suporte prioritário'],
  },
  enterprise: {
    name: 'Enterprise',
    prices: {
      monthly: 600.00,
      quarterly: 1620.00,   // 10% off
      semiannual: 2700.00,  // 25% off
      yearly: 4320.00,      // 40% off
    },
    features: ['Tudo do Studio', '1400 gerações/mês', 'Suporte dedicado'],
  },
};
