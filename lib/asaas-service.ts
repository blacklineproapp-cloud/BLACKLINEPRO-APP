/**
 * Serviço Asaas - Busca dados reais da API
 * 
 * Busca informações financeiras direto da API do Asaas:
 * - Assinaturas ativas
 * - Pagamentos recebidos
 * - MRR real
 */

import { asaasGet } from './asaas/client';

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  status: string;
  description?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  status: string;
  billingType: string;
  dueDate: string;
  paymentDate?: string;  // Data em que o pagamento foi confirmado
  confirmedDate?: string;  // Data de confirmação alternativa
  subscription?: string;
}

export interface AsaasFinancialMetrics {
  subscriptions: {
    total: number;
    active: number;
    list: AsaasSubscription[];
  };
  payments: {
    total: number;
    received: number;
    pending: number;
    totalValue: number;
    receivedValue: number;
    list: AsaasPayment[];
  };
  mrr: number;
}

export class AsaasService {
  /**
   * Busca todas as assinaturas ativas
   */
  static async getActiveSubscriptions(): Promise<AsaasSubscription[]> {
    try {
      console.log('[AsaasService] Buscando assinaturas ativas...');
      
      const response = await asaasGet<{ data: AsaasSubscription[] }>('/subscriptions', {
        status: 'ACTIVE',
        limit: 100,
      });

      const subscriptions = response.data || [];
      console.log(`[AsaasService] ${subscriptions.length} assinaturas ativas encontradas`);
      
      return subscriptions;
    } catch (error) {
      console.error('[AsaasService] Erro ao buscar assinaturas:', error);
      return [];
    }
  }

  /**
   * Busca pagamentos recebidos (últimos 90 dias)
   */
  static async getPayments(days: number = 90): Promise<AsaasPayment[]> {
    try {
      console.log(`[AsaasService] Buscando pagamentos dos últimos ${days} dias...`);
      
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      
      const response = await asaasGet<{ data: AsaasPayment[] }>('/payments', {
        'dateCreated[ge]': dateFrom.toISOString().split('T')[0],
        status: 'RECEIVED',
        limit: 100,
      });

      const payments = response.data || [];
      console.log(`[AsaasService] ${payments.length} pagamentos encontrados`);
      
      return payments;
    } catch (error) {
      console.error('[AsaasService] Erro ao buscar pagamentos:', error);
      return [];
    }
  }

  /**
   * Busca todos os pagamentos (incluindo pendentes)
   */
  static async getAllPayments(days: number = 90): Promise<AsaasPayment[]> {
    try {
      console.log(`[AsaasService] Buscando todos os pagamentos dos últimos ${days} dias...`);
      
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      
      const response = await asaasGet<{ data: AsaasPayment[] }>('/payments', {
        'dateCreated[ge]': dateFrom.toISOString().split('T')[0],
        limit: 100,
      });

      const payments = response.data || [];
      console.log(`[AsaasService] ${payments.length} pagamentos totais encontrados`);
      
      return payments;
    } catch (error) {
      console.error('[AsaasService] Erro ao buscar todos os pagamentos:', error);
      return [];
    }
  }

  /**
   * Calcula MRR real baseado nas assinaturas ativas
   */
  static calculateMRR(subscriptions: AsaasSubscription[]): number {
    let mrr = 0;

    subscriptions.forEach(sub => {
      const value = Number(sub.value) || 0;
      const cycle = sub.cycle || 'MONTHLY';

      // Normalizar para mensal (MRR)
      if (cycle === 'MONTHLY') mrr += value;
      else if (cycle === 'QUARTERLY') mrr += value / 3;
      else if (cycle === 'SEMIANNUALLY') mrr += value / 6;
      else if (cycle === 'YEARLY') mrr += value / 12;
    });

    return mrr;
  }

  /**
   * Busca métricas financeiras consolidadas
   */
  static async getFinancialMetrics(): Promise<AsaasFinancialMetrics> {
    try {
      console.log('[AsaasService] Buscando métricas financeiras consolidadas...');

      // Buscar assinaturas e pagamentos em paralelo
      const [subscriptions, allPayments] = await Promise.all([
        this.getActiveSubscriptions(),
        this.getAllPayments(90),
      ]);

      // Filtrar pagamentos REALMENTE recebidos (status RECEIVED + paymentDate confirmado)
      const now = new Date();
      const receivedPayments = allPayments.filter(p => {
        if (p.status !== 'RECEIVED') return false;
        if (!p.paymentDate) return false;  // Sem paymentDate = não confirmado
        const paymentDate = new Date(p.paymentDate);
        return paymentDate <= now;  // Apenas pagamentos já confirmados
      });
      const pendingPayments = allPayments.filter(p => ['PENDING', 'OVERDUE'].includes(p.status));

      // Calcular valores
      const totalValue = allPayments.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
      const receivedValue = receivedPayments.reduce((sum, p) => sum + (Number(p.netValue) || Number(p.value) || 0), 0);

      // Calcular MRR
      const mrr = this.calculateMRR(subscriptions);

      console.log(`[AsaasService] 💰 Recebido REAL: R$ ${receivedValue.toFixed(2)} (${receivedPayments.length} pagamentos confirmados) | MRR: R$ ${mrr.toFixed(2)}`);
      console.log(`[AsaasService] 📊 Total: ${allPayments.length} pagamentos, ${pendingPayments.length} pendentes`);

      return {
        subscriptions: {
          total: subscriptions.length,
          active: subscriptions.filter(s => s.status === 'ACTIVE').length,
          list: subscriptions,
        },
        payments: {
          total: allPayments.length,
          received: receivedPayments.length,
          pending: pendingPayments.length,
          totalValue,
          receivedValue,
          list: receivedPayments.slice(0, 20), // Últimos 20 pagamentos
        },
        mrr,
      };
    } catch (error) {
      console.error('[AsaasService] Erro ao buscar métricas financeiras:', error);
      
      // Retornar valores zerados em caso de erro
      return {
        subscriptions: { total: 0, active: 0, list: [] },
        payments: { total: 0, received: 0, pending: 0, totalValue: 0, receivedValue: 0, list: [] },
        mrr: 0,
      };
    }
  }
}
