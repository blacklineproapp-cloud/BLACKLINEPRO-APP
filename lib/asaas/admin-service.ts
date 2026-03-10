/**
 * Asaas Admin Service - Financial metrics for admin dashboard
 *
 * Fetches consolidated financial data from Asaas API:
 * - Active subscriptions
 * - Received payments
 * - Real MRR calculation
 */

import { asaasGet } from './client';
import { logger } from '../logger';

// Simplified response shapes for admin metrics (avoid conflict with full Asaas types)
export interface AdminSubscriptionInfo {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  status: string;
  description?: string;
}

export interface AdminPaymentInfo {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  status: string;
  billingType: string;
  dueDate: string;
  paymentDate?: string;
  confirmedDate?: string;
  subscription?: string;
}

export interface AsaasFinancialMetrics {
  subscriptions: {
    total: number;
    active: number;
    list: AdminSubscriptionInfo[];
  };
  payments: {
    total: number;
    received: number;
    pending: number;
    totalValue: number;
    receivedValue: number;
    list: AdminPaymentInfo[];
  };
  mrr: number;
}

export class AsaasAdminService {
  /**
   * Fetch all active subscriptions
   */
  static async getActiveSubscriptions(): Promise<AdminSubscriptionInfo[]> {
    try {
      const response = await asaasGet<{ data: AdminSubscriptionInfo[] }>('/subscriptions', {
        status: 'ACTIVE',
        limit: 100,
      });

      return response.data || [];
    } catch (error) {
      logger.error('[AsaasAdminService] Error fetching subscriptions:', error);
      return [];
    }
  }

  /**
   * Fetch received payments (last N days)
   */
  static async getPayments(days: number = 90): Promise<AdminPaymentInfo[]> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const response = await asaasGet<{ data: AdminPaymentInfo[] }>('/payments', {
        'dateCreated[ge]': dateFrom.toISOString().split('T')[0],
        status: 'RECEIVED',
        limit: 100,
      });

      return response.data || [];
    } catch (error) {
      logger.error('[AsaasAdminService] Error fetching payments:', error);
      return [];
    }
  }

  /**
   * Fetch all payments including pending (last N days)
   */
  static async getAllPayments(days: number = 90): Promise<AdminPaymentInfo[]> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const response = await asaasGet<{ data: AdminPaymentInfo[] }>('/payments', {
        'dateCreated[ge]': dateFrom.toISOString().split('T')[0],
        limit: 100,
      });

      return response.data || [];
    } catch (error) {
      logger.error('[AsaasAdminService] Error fetching all payments:', error);
      return [];
    }
  }

  /**
   * Calculate real MRR from active subscriptions
   */
  static calculateMRR(subscriptions: AdminSubscriptionInfo[]): number {
    let mrr = 0;

    for (const sub of subscriptions) {
      const value = Number(sub.value) || 0;
      const cycle = sub.cycle || 'MONTHLY';

      if (cycle === 'MONTHLY') mrr += value;
      else if (cycle === 'QUARTERLY') mrr += value / 3;
      else if (cycle === 'SEMIANNUALLY') mrr += value / 6;
      else if (cycle === 'YEARLY') mrr += value / 12;
    }

    return mrr;
  }

  /**
   * Consolidated financial metrics
   */
  static async getFinancialMetrics(): Promise<AsaasFinancialMetrics> {
    try {
      const [subscriptions, allPayments] = await Promise.all([
        this.getActiveSubscriptions(),
        this.getAllPayments(90),
      ]);

      const now = new Date();
      const receivedPayments = allPayments.filter(p => {
        if (p.status !== 'RECEIVED') return false;
        if (!p.paymentDate) return false;
        const paymentDate = new Date(p.paymentDate);
        return paymentDate <= now;
      });
      const pendingPayments = allPayments.filter(p => ['PENDING', 'OVERDUE'].includes(p.status));

      const totalValue = allPayments.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
      const receivedValue = receivedPayments.reduce((sum, p) => sum + (Number(p.netValue) || Number(p.value) || 0), 0);
      const mrr = this.calculateMRR(subscriptions);

      logger.info(`[AsaasAdminService] Received: R$ ${receivedValue.toFixed(2)} (${receivedPayments.length} payments) | MRR: R$ ${mrr.toFixed(2)}`);

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
          list: receivedPayments.slice(0, 20),
        },
        mrr,
      };
    } catch (error) {
      logger.error('[AsaasAdminService] Error fetching financial metrics:', error);

      return {
        subscriptions: { total: 0, active: 0, list: [] },
        payments: { total: 0, received: 0, pending: 0, totalValue: 0, receivedValue: 0, list: [] },
        mrr: 0,
      };
    }
  }
}
