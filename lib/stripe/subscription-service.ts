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

/**
 * Converte timestamp do Stripe (unix seconds) para ISO string de forma segura
 * Retorna null se o valor for null, undefined ou inválido
 */
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
  if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
    return null;
  }
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch (e) {
    console.error('[SubscriptionService] Erro ao converter timestamp:', timestamp, e);
    return null;
  }
}

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
          current_period_start: safeTimestampToISO(stripeSubscription.current_period_start)!,
          current_period_end: safeTimestampToISO(stripeSubscription.current_period_end)!,
          trial_start: safeTimestampToISO(stripeSubscription.trial_start),
          trial_end: safeTimestampToISO(stripeSubscription.trial_end),
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
   * Sincroniza subscription do Stripe com banco (UPSERT)
   * Se não existir no banco, cria automaticamente
   */
  static async syncFromStripe(
    stripeSubscriptionId: string,
    customerId?: string
  ): Promise<Subscription> {
    try {
      // 1. Buscar do Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      // 2. Buscar no banco
      let subscription = await this.getByStripeId(stripeSubscriptionId);

      // 3. Se não existir, criar (UPSERT)
      if (!subscription) {
        console.log(`[SubscriptionService] Subscription ${stripeSubscriptionId} não existe no banco. Criando...`);

        // Buscar customer_id se não foi passado
        let dbCustomerId = customerId;
        if (!dbCustomerId) {
          const stripeCustomerId = typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer.id;

          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('stripe_customer_id', stripeCustomerId)
            .single();

          if (customer) {
            dbCustomerId = customer.id;
          }
        }

        if (!dbCustomerId) {
          console.warn(`[SubscriptionService] Customer não encontrado para subscription ${stripeSubscriptionId}. Pulando criação.`);
          // Retornar objeto mínimo para não quebrar o fluxo
          return {
            id: 'temp-' + stripeSubscriptionId,
            stripe_subscription_id: stripeSubscriptionId,
            status: stripeSubscription.status as SubscriptionStatus,
          } as Subscription;
        }

        // Criar subscription no banco
        const { data: newSubscription, error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            customer_id: dbCustomerId,
            stripe_subscription_id: stripeSubscription.id,
            stripe_price_id: stripeSubscription.items.data[0].price.id,
            stripe_product_id: typeof stripeSubscription.items.data[0].price.product === 'string'
              ? stripeSubscription.items.data[0].price.product
              : stripeSubscription.items.data[0].price.product.id,
            status: stripeSubscription.status as SubscriptionStatus,
            current_period_start: safeTimestampToISO(stripeSubscription.current_period_start)!,
            current_period_end: safeTimestampToISO(stripeSubscription.current_period_end)!,
            trial_start: safeTimestampToISO(stripeSubscription.trial_start),
            trial_end: safeTimestampToISO(stripeSubscription.trial_end),
            canceled_at: safeTimestampToISO(stripeSubscription.canceled_at),
            ended_at: safeTimestampToISO(stripeSubscription.ended_at),
            metadata: stripeSubscription.metadata || {}
          })
          .select()
          .single();

        if (insertError) {
          // Se erro de duplicação, tentar buscar novamente
          if (insertError.code === '23505') {
            subscription = await this.getByStripeId(stripeSubscriptionId);
            if (subscription) {
              console.log(`[SubscriptionService] Subscription já existia (race condition), usando existente`);
            }
          } else {
            throw new Error(`Erro ao criar subscription: ${insertError.message}`);
          }
        } else {
          console.log(`[SubscriptionService] ✅ Subscription criada: ${newSubscription?.id}`);
          return newSubscription!;
        }
      }

      // 4. Atualizar com dados do Stripe
      return await this.updateSubscription(subscription!.id, {
        status: stripeSubscription.status as SubscriptionStatus,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        current_period_start: safeTimestampToISO(stripeSubscription.current_period_start)!,
        current_period_end: safeTimestampToISO(stripeSubscription.current_period_end)!,
        trial_start: safeTimestampToISO(stripeSubscription.trial_start),
        trial_end: safeTimestampToISO(stripeSubscription.trial_end),
        canceled_at: safeTimestampToISO(stripeSubscription.canceled_at),
        ended_at: safeTimestampToISO(stripeSubscription.ended_at)
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
