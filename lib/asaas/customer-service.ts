/**
 * Asaas Customer Service
 *
 * Gerenciamento de clientes no Asaas
 */

import { asaasGet, asaasPost, asaasPut, asaasDelete } from './client';
import { supabaseAdmin } from '../supabase';
import { maskEmail } from '../logger';
import type {
  AsaasCustomer,
  CreateCustomerParams,
  AsaasListResponse,
} from './types';

export class AsaasCustomerService {
  /**
   * Cria um novo cliente no Asaas
   */
  static async create(params: CreateCustomerParams): Promise<AsaasCustomer> {
    const customer = await asaasPost<AsaasCustomer>('/customers', params);

    console.log(`[AsaasCustomer] Cliente criado: ${customer.id} - ${maskEmail(customer.email)}`);

    return customer;
  }

  /**
   * Busca cliente por ID
   */
  static async getById(customerId: string): Promise<AsaasCustomer | null> {
    try {
      return await asaasGet<AsaasCustomer>(`/customers/${customerId}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca cliente por CPF/CNPJ
   */
  static async getByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    try {
      const response = await asaasGet<AsaasListResponse<AsaasCustomer>>('/customers', {
        cpfCnpj: cpfCnpj.replace(/\D/g, ''), // Remove formatação
      });

      return response.data[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca cliente por email
   */
  static async getByEmail(email: string): Promise<AsaasCustomer | null> {
    try {
      const response = await asaasGet<AsaasListResponse<AsaasCustomer>>('/customers', {
        email,
      });

      return response.data[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca cliente por externalReference (clerk_id ou user_id)
   */
  static async getByExternalReference(externalReference: string): Promise<AsaasCustomer | null> {
    try {
      const response = await asaasGet<AsaasListResponse<AsaasCustomer>>('/customers', {
        externalReference,
      });

      return response.data[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Atualiza um cliente
   */
  static async update(
    customerId: string,
    params: Partial<CreateCustomerParams>
  ): Promise<AsaasCustomer> {
    const customer = await asaasPut<AsaasCustomer>(`/customers/${customerId}`, params);

    console.log(`[AsaasCustomer] Cliente atualizado: ${customer.id}`);

    return customer;
  }

  /**
   * Remove um cliente (soft delete)
   */
  static async delete(customerId: string): Promise<{ deleted: boolean; id: string }> {
    const result = await asaasDelete<{ deleted: boolean; id: string }>(
      `/customers/${customerId}`
    );

    console.log(`[AsaasCustomer] Cliente removido: ${customerId}`);

    return result;
  }

  /**
   * Lista todos os clientes
   */
  static async list(params?: {
    offset?: number;
    limit?: number;
    name?: string;
    email?: string;
    cpfCnpj?: string;
    groupName?: string;
    externalReference?: string;
  }): Promise<AsaasListResponse<AsaasCustomer>> {
    return asaasGet<AsaasListResponse<AsaasCustomer>>('/customers', params);
  }

  // ============================================================================
  // INTEGRAÇÃO COM BANCO DE DADOS
  // ============================================================================

  /**
   * Busca ou cria cliente no Asaas e sincroniza com banco
   */
  static async findOrCreate(params: {
    userId: string;
    clerkId: string;
    email: string;
    name: string;
    cpfCnpj?: string;
    phone?: string;
  }): Promise<{ asaasCustomer: AsaasCustomer; dbCustomer: any }> {
    const { userId, clerkId, email, name, cpfCnpj, phone } = params;

    // 1. Verificar se já existe no banco com asaas_customer_id
    const { data: existingDbCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .not('asaas_customer_id', 'is', null)
      .single();

    if (existingDbCustomer?.asaas_customer_id) {
      // Já existe, buscar no Asaas
      const asaasCustomer = await this.getById(existingDbCustomer.asaas_customer_id);
      if (asaasCustomer) {
        return { asaasCustomer, dbCustomer: existingDbCustomer };
      }
    }

    // 2. Buscar no Asaas por externalReference (clerk_id)
    let asaasCustomer = await this.getByExternalReference(clerkId);

    // 3. Se não encontrou, buscar por email
    if (!asaasCustomer && email) {
      asaasCustomer = await this.getByEmail(email);
    }

    // 4. Se não encontrou, criar novo
    if (!asaasCustomer) {
      // CPF/CNPJ é OBRIGATÓRIO no Asaas - não aceitar sem CPF válido
      if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
        throw new Error('CPF/CNPJ obrigatório para criar conta de pagamento');
      }

      asaasCustomer = await this.create({
        name,
        email,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''), // Remover formatação
        mobilePhone: phone,
        externalReference: clerkId,
        notificationDisabled: false,
      });
    }

    // 5. Salvar/atualizar no banco
    const { data: dbCustomer, error } = await supabaseAdmin
      .from('customers')
      .upsert({
        user_id: userId,
        asaas_customer_id: asaasCustomer.id,
        email,
        nome: name,
        phone,
        cpf_cnpj: cpfCnpj || asaasCustomer.cpfCnpj,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[AsaasCustomer] Erro ao salvar no banco:', error);
    }

    return { asaasCustomer, dbCustomer };
  }

  /**
   * Busca cliente do banco por user_id
   */
  static async getDbCustomerByUserId(userId: string): Promise<any | null> {
    const { data } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data;
  }

  /**
   * Busca cliente do banco por asaas_customer_id
   * Verifica primeiro na tabela asaas_customers (nova migração)
   * Depois tenta customers (legado)
   * 🚀 OTIMIZADO: Se não encontrar no banco, tenta buscar no Asaas e sinkronizar
   */
  static async getDbCustomerByAsaasId(asaasCustomerId: string): Promise<{ data: any, source: 'asaas_customers' | 'customers' } | null> {
    // 1. Tentar na tabela asaas_customers (nova migração)
    const { data: asaasCustomer } = await supabaseAdmin
      .from('asaas_customers')
      .select('*')
      .eq('asaas_customer_id', asaasCustomerId)
      .maybeSingle();

    if (asaasCustomer) {
      return { data: asaasCustomer, source: 'asaas_customers' };
    }

    // 2. Fallback: tentar na tabela customers (legado)
    const { data: legacyCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('asaas_customer_id', asaasCustomerId)
      .maybeSingle();

    if (legacyCustomer) {
      return { data: legacyCustomer, source: 'customers' };
    }

    // 3. 🔍 DESCOBERTA AUTOMÁTICA: Não está no banco, buscar no Asaas
    console.log(`[AsaasCustomer] 🔍 Cliente ${asaasCustomerId} não encontrado no banco. Tentando descoberta via API...`);
    
    try {
      const externalCustomer = await this.getById(asaasCustomerId);
      
      if (externalCustomer) {
        console.log(`[AsaasCustomer] ✅ Cliente encontrado no Asaas: ${externalCustomer.email}`);
        
        // Tentar encontrar usuário no banco por externalReference (clerk_id) ou email
        const searchId = externalCustomer.externalReference;
        const searchEmail = externalCustomer.email;
        
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .or(`clerk_id.eq."${searchId}",email.eq."${searchEmail}"`)
          .maybeSingle();
          
        if (user) {
          console.log(`[AsaasCustomer] 🔗 Linkando cliente ${asaasCustomerId} ao usuário ${user.id}`);
          
          // Criar registro na tabela customers (legado ou nova, aqui usaremos asaas_customers por ser mais moderna)
          const { data: newEntry, error: insertError } = await supabaseAdmin
            .from('asaas_customers')
            .upsert({
              user_id: user.id,
              asaas_customer_id: asaasCustomerId,
              email: externalCustomer.email,
              name: externalCustomer.name,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select()
            .single();
            
          if (newEntry) {
            return { data: newEntry, source: 'asaas_customers' };
          }
        } else {
          console.warn(`[AsaasCustomer] ⚠️ Cliente ${asaasCustomerId} encontrado no Asaas mas nenhum usuário correspondente no banco (Ref: ${searchId}, Email: ${searchEmail})`);
        }
      }
    } catch (apiError) {
      console.error(`[AsaasCustomer] ❌ Erro na descoberta do cliente ${asaasCustomerId}:`, apiError);
    }

    return null;
  }
}
