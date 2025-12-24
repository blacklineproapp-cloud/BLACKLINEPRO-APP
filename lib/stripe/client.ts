/**
 * Stripe Client Singleton
 * Cliente HTTP do Stripe com retry pattern e error handling
 */

import Stripe from 'stripe';

class StripeClient {
  private static instance: Stripe | null = null;

  private static readonly config: Stripe.StripeConfig = {
    apiVersion: '2024-04-10',
    maxNetworkRetries: 3,
    timeout: 30000, // 30 segundos
    telemetry: false
  };

  /**
   * Obtém a instância singleton do Stripe
   */
  static getInstance(): Stripe {
    if (!this.instance) {
      const apiKey = process.env.STRIPE_SECRET_KEY;

      if (!apiKey) {
        throw new Error(
          'STRIPE_SECRET_KEY não está definida nas variáveis de ambiente'
        );
      }

      if (!apiKey.startsWith('sk_')) {
        throw new Error(
          'STRIPE_SECRET_KEY inválida. Deve começar com sk_test_ ou sk_live_'
        );
      }

      this.instance = new Stripe(apiKey, this.config);

      console.log('[Stripe] Cliente inicializado com sucesso');
    }

    return this.instance;
  }

  /**
   * Reseta a instância (útil para testes)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Verifica se está em modo de teste
   */
  static isTestMode(): boolean {
    const apiKey = process.env.STRIPE_SECRET_KEY || '';
    return apiKey.startsWith('sk_test_');
  }

  /**
   * Obtém a versão da API
   */
  static getApiVersion(): string {
    return this.config.apiVersion!;
  }
}

// Exportar a instância diretamente
export const stripe = StripeClient.getInstance();

// Exportar a classe para casos especiais
export default StripeClient;
