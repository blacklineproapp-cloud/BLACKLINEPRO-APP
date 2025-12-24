/**
 * Customer Service
 * Gerenciamento de customers do Stripe
 */

import { stripe } from './client';
import { supabaseAdmin } from '../supabase';
import type { Customer, CreateCustomerParams } from './types';

export class CustomerService {
  /**
   * Cria um customer no Stripe e no banco de dados
   */
  static async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    const { userId, email, name, phone } = params;

    try {
      // 1. Verificar se já existe customer para este usuário
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingCustomer) {
        return existingCustomer;
      }

      // 2. Criar customer no Stripe
      const stripeCustomer = await stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          user_id: userId
        }
      });

      // 3. Salvar no banco de dados
      const { data: customer, error } = await supabaseAdmin
        .from('customers')
        .insert({
          user_id: userId,
          stripe_customer_id: stripeCustomer.id,
          email,
          nome: name,
          phone
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar customer no banco: ${error.message}`);
      }

      console.log('[CustomerService] Customer criado:', customer.id);

      return customer;
    } catch (error: any) {
      console.error('[CustomerService] Erro ao criar customer:', error);
      throw error;
    }
  }

  /**
   * Busca ou cria um customer
   */
  static async getOrCreateCustomer(
    params: CreateCustomerParams
  ): Promise<Customer> {
    try {
      // Tentar buscar primeiro
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('user_id', params.userId)
        .single();

      if (customer) {
        return customer;
      }

      // Se não existe, criar
      return await this.createCustomer(params);
    } catch (error: any) {
      console.error('[CustomerService] Erro em getOrCreateCustomer:', error);
      throw error;
    }
  }

  /**
   * Busca customer por ID do usuário
   */
  static async getByUserId(userId: string): Promise<Customer | null> {
    try {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .single();

      return customer;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca customer por Stripe Customer ID
   */
  static async getByStripeId(stripeCustomerId: string): Promise<Customer | null> {
    try {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      return customer;
    } catch (error) {
      return null;
    }
  }

  /**
   * Atualiza dados do customer
   */
  static async updateCustomer(
    customerId: string,
    updates: Partial<Customer>
  ): Promise<Customer> {
    try {
      const { data: customer, error } = await supabaseAdmin
        .from('customers')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar customer: ${error.message}`);
      }

      console.log('[CustomerService] Customer atualizado:', customerId);

      return customer;
    } catch (error: any) {
      console.error('[CustomerService] Erro ao atualizar customer:', error);
      throw error;
    }
  }

  /**
   * Sincroniza dados do Stripe com o banco
   */
  static async syncFromStripe(stripeCustomerId: string): Promise<Customer> {
    try {
      // Buscar do Stripe
      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);

      if (stripeCustomer.deleted) {
        throw new Error('Customer foi deletado no Stripe');
      }

      // Buscar no banco
      const customer = await this.getByStripeId(stripeCustomerId);

      if (!customer) {
        throw new Error('Customer não encontrado no banco');
      }

      // Atualizar com dados do Stripe
      return await this.updateCustomer(customer.id, {
        email: stripeCustomer.email || customer.email,
        nome: stripeCustomer.name || customer.nome,
        phone: stripeCustomer.phone || customer.phone
      });
    } catch (error: any) {
      console.error('[CustomerService] Erro ao sincronizar:', error);
      throw error;
    }
  }
}
