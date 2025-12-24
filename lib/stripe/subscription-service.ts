/**
 * Subscription Service
 * Gerenciamento de assinaturas do Stripe
 */

import { stripe } from './client';
import { supabaseAdmin } from '../supabase';
import type {
  Subscription,
  SubscriptionStatus,
  CreateSubscriptionParams,
  UpdateSubscriptionParams
} from './types';

export class SubscriptionService {
  /**
   * Cria uma assinatura no Stripe e no banco
   */
  static async createSubscription(
    params: CreateSubscriptionParams
  ): Promise<Subscription> {
    const { customerId, priceId, trialDays, metadata } = params;

    try {
      // 1. Buscar customer no banco
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('stripe_customer_id')
        .eq('id', customerId)
        .single();

      if (!customer?.stripe_customer_id) {
        throw new Error('Customer não possui stripe_customer_id');
      }

      // 2. Criar subscription no Stripe
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customer.stripe_customer_id,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        metadata: metadata || {},
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent']
      });

      // 3. Salvar no banco
      const { data: subscription, error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          customer_id: customerId,
          stripe_subscription_id: stripeSubscription.id,
          stripe_price_id: priceId,
          stripe_product_id: typeof stripeSubscription.items.data[0].price.product === 'string'
            ? stripeSubscription.items.data[0].price.product
            : stripeSubscription.items.data[0].price.product.id,
          status: stripeSubscription.status as SubscriptionStatus,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          trial_start: stripeSubscription.trial_start
            ? new Date(stripeSubscription.trial_start * 1000).toISOString()
            : null,
          trial_end: stripeSubscription.trial_end
            ? new Date(stripeSubscription.trial_end * 1000).toISOString()
            : null,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao salvar subscription: ${error.message}`);
      }

      console.log('[SubscriptionService] Subscription criada:', subscription.id);

      return subscription;
    } catch (error: any) {
      console.error('[SubscriptionService] Erro ao criar subscription:', error);
      throw error;
    }
  }

  /**
   * Busca subscription por ID do customer
   */
  static async getByCustomerId(customerId: string): Promise<Subscription | null> {
    try {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return subscription;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca subscription por Stripe Subscription ID
   */
  static async getByStripeId(
    stripeSubscriptionId: string
  ): Promise<Subscription | null> {
    try {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

      return subscription;
    } catch (error) {
      return null;
    }
  }

  /**
   * Atualiza subscription
   */
  static async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    try {
      const { data: subscription, error } = await supabaseAdmin
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar subscription: ${error.message}`);
      }

      console.log('[SubscriptionService] Subscription atualizada:', subscriptionId);

      return subscription;
    } catch (error: any) {
      console.error('[SubscriptionService] Erro ao atualizar:', error);
      throw error;
    }
  }

  /**
   * Cancela subscription
   */
  static async cancelSubscription(
    stripeSubscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    try {
      // 1. Cancelar no Stripe
      const stripeSubscription = await stripe.subscriptions.update(
        stripeSubscriptionId,
        {
          cancel_at_period_end: cancelAtPeriodEnd
        }
      );

      // 2. Buscar no banco
      const subscription = await this.getByStripeId(stripeSubscriptionId);

      if (!subscription) {
        throw new Error('Subscription não encontrada no banco');
      }

      // 3. Atualizar no banco
      return await this.updateSubscription(subscription.id, {
        status: stripeSubscription.status as SubscriptionStatus,
        canceled_at: cancelAtPeriodEnd
          ? new Date().toISOString()
          : null
      });
    } catch (error: any) {
      console.error('[SubscriptionService] Erro ao cancelar:', error);
      throw error;
    }
  }

  /**
   * Sincroniza subscription do Stripe com banco
   */
  static async syncFromStripe(
    stripeSubscriptionId: string
  ): Promise<Subscription> {
    try {
      // 1. Buscar do Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      // 2. Buscar no banco
      const subscription = await this.getByStripeId(stripeSubscriptionId);

      if (!subscription) {
        throw new Error('Subscription não encontrada no banco');
      }

      // 3. Atualizar com dados do Stripe
      return await this.updateSubscription(subscription.id, {
        status: stripeSubscription.status as SubscriptionStatus,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        trial_start: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000).toISOString()
          : null,
        trial_end: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : null,
        canceled_at: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
          : null,
        ended_at: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000).toISOString()
          : null
      });
    } catch (error: any) {
      console.error('[SubscriptionService] Erro ao sincronizar:', error);
      throw error;
    }
  }

  /**
   * Verifica se subscription está ativa
   */
  static isActive(subscription: Subscription): boolean {
    return ['active', 'trialing'].includes(subscription.status);
  }
}
