/**
 * Checkout Service
 * Gerenciamento de checkout e customer portal
 */

import { stripe } from './client';
import type { CreateCheckoutSessionResponse, CreatePortalSessionResponse } from './types';

export class CheckoutService {
  /**
   * Cria uma sessão de checkout
   */
  static async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialDays?: number;
  }): Promise<CreateCheckoutSessionResponse> {
    const {
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata,
      trialDays
    } = params;

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card', 'boleto'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
        subscription_data: {
          trial_period_days: trialDays,
          metadata: metadata || {}
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto'
      });

      console.log('[CheckoutService] Checkout session criada:', session.id);

      return {
        url: session.url,
        sessionId: session.id
      };
    } catch (error: any) {
      console.error('[CheckoutService] Erro ao criar checkout:', error);
      throw error;
    }
  }

  /**
   * Cria uma sessão do customer portal
   */
  static async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<CreatePortalSessionResponse> {
    const { customerId, returnUrl } = params;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      console.log('[CheckoutService] Portal session criada para:', customerId);

      return {
        url: session.url
      };
    } catch (error: any) {
      console.error('[CheckoutService] Erro ao criar portal:', error);
      throw error;
    }
  }

  /**
   * Cria um Payment Intent para checkout embedded
   */
  static async createPaymentIntent(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const { customerId, priceId, metadata } = params;

    try {
      // Buscar informações do preço
      const price = await stripe.prices.retrieve(priceId);

      if (!price.unit_amount) {
        throw new Error('Preço não possui valor definido');
      }

      // Criar Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customerId,
        amount: price.unit_amount,
        currency: price.currency,
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          price_id: priceId,
          ...metadata
        }
      });

      console.log('[CheckoutService] Payment Intent criado:', paymentIntent.id);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      console.error('[CheckoutService] Erro ao criar Payment Intent:', error);
      throw error;
    }
  }

  /**
   * Recupera informações de uma sessão de checkout
   */
  static async getCheckoutSession(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      });

      return session;
    } catch (error: any) {
      console.error('[CheckoutService] Erro ao buscar sessão:', error);
      throw error;
    }
  }

  /**
   * Cria uma sessão de checkout iniciada pelo admin
   * Para enviar link de pagamento ao usuário
   */
  static async createAdminCheckoutSession(params: {
    userEmail: string;
    userName?: string;
    priceId: string;
    planType: 'starter' | 'pro' | 'studio';
    adminId: string;
    clerkId: string;
  }): Promise<CreateCheckoutSessionResponse> {
    const { userEmail, userName, priceId, planType, adminId, clerkId } = params;

    try {
      // 1. Buscar ou criar customer no Stripe
      let customerId: string;

      // Tentar buscar customer existente por email
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log('[CheckoutService] Customer existente encontrado:', customerId);
      } else {
        // Criar novo customer
        const customer = await stripe.customers.create({
          email: userEmail,
          name: userName,
          metadata: {
            clerk_id: clerkId,
            created_by_admin: 'true',
            admin_id: adminId
          }
        });
        customerId = customer.id;
        console.log('[CheckoutService] Novo customer criado:', customerId);
      }

      // 2. Criar checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card', 'boleto'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
        metadata: {
          admin_initiated: 'true',
          admin_id: adminId,
          plan: planType,
          clerk_id: clerkId
        },
        client_reference_id: clerkId,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto'
        }
      });

      console.log('[CheckoutService] Admin checkout session criada:', session.id);

      return {
        url: session.url,
        sessionId: session.id
      };
    } catch (error: any) {
      console.error('[CheckoutService] Erro ao criar admin checkout:', error);
      throw error;
    }
  }
}
