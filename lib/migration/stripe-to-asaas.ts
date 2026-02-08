/**
 * Stripe to Asaas Migration Service
 *
 * Processa a migração de usuários do Stripe para o Asaas
 * Quando o usuário fornece o CPF, cria cliente e assinatura no Asaas
 */

import { supabaseAdmin } from '../supabase';
import { AsaasCustomerService } from '../asaas/customer-service';
import { AsaasSubscriptionService } from '../asaas/subscription-service';
import { ASAAS_PLANS } from '../asaas/types';
import { formatAsaasDate } from '../asaas/client';

export interface MigrationQueueItem {
  id: string;
  user_id: string | null;
  email: string;
  migration_type: 'pagante' | 'cortesia_pagou' | 'cortesia_nunca_pagou';
  stripe_customer_id: string | null;
  stripe_first_payment_date: string | null;
  stripe_last_payment_date: string | null;
  stripe_total_payments: number;
  is_courtesy: boolean;
  courtesy_granted_at: string | null;
  current_plan: string;
  billing_day: number;
  next_due_date: string;
  status: 'pending' | 'migrated' | 'skipped' | 'failed';
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class StripeToAsaasMigration {
  /**
   * Verifica se o usuário precisa fornecer CPF para migração
   */
  static async checkUserNeedsCpf(userId: string): Promise<{
    needsCpf: boolean;
    migrationItem: MigrationQueueItem | null;
    currentPlan: string | null;
  }> {
    // Buscar usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, requires_cpf, cpf_cnpj, migration_status, plan, admin_courtesy')
      .eq('id', userId)
      .single();

    if (!user) {
      return { needsCpf: false, migrationItem: null, currentPlan: null };
    }

    // Se já tem CPF, não precisa, já migrou ou é cortesia admin, retornar
    if (
      !user.requires_cpf || 
      user.cpf_cnpj || 
      user.migration_status === 'migrated' || 
      user.migration_status === 'completed' ||
      user.admin_courtesy === true
    ) {
      return { needsCpf: false, migrationItem: null, currentPlan: user.plan };
    }

    // Buscar na fila de migração
    const { data: migrationItem } = await supabaseAdmin
      .from('migration_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    return {
      needsCpf: !!migrationItem,
      migrationItem: migrationItem as MigrationQueueItem | null,
      currentPlan: user.plan,
    };
  }

  /**
   * Busca item da fila de migração por email
   */
  static async getMigrationItemByEmail(email: string): Promise<MigrationQueueItem | null> {
    const { data } = await supabaseAdmin
      .from('migration_queue')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    return data as MigrationQueueItem | null;
  }

  /**
   * Valida CPF/CNPJ
   */
  static validateCpfCnpj(value: string): { valid: boolean; cleaned: string; type: 'cpf' | 'cnpj' | null } {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length === 11) {
      // Validar CPF
      if (this.isValidCpf(cleaned)) {
        return { valid: true, cleaned, type: 'cpf' };
      }
    } else if (cleaned.length === 14) {
      // Validar CNPJ
      if (this.isValidCnpj(cleaned)) {
        return { valid: true, cleaned, type: 'cnpj' };
      }
    }

    return { valid: false, cleaned, type: null };
  }

  private static isValidCpf(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf[10])) return false;

    return true;
  }

  private static isValidCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cnpj[12]) !== digit1) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cnpj[13]) !== digit2) return false;

    return true;
  }

  /**
   * Calcula a próxima data de cobrança baseada no billing_day
   */
  static calculateNextDueDate(billingDay: number): string {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Se já passou do billing_day neste mês, vai para o próximo mês
    let targetMonth = currentMonth;
    let targetYear = currentYear;

    if (currentDay >= billingDay) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    // Ajustar para meses com menos dias
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const adjustedDay = Math.min(billingDay, lastDayOfMonth);

    const dueDate = new Date(targetYear, targetMonth, adjustedDay);
    return formatAsaasDate(dueDate);
  }

  /**
   * Processa a migração de um usuário
   */
  static async processMigration(params: {
    userId: string;
    cpfCnpj: string;
    name: string;
    phone?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    asaasCustomerId?: string;
    asaasSubscriptionId?: string;
  }> {
    const { userId, cpfCnpj, name, phone } = params;

    try {
      // 1. Validar CPF/CNPJ
      const validation = this.validateCpfCnpj(cpfCnpj);
      if (!validation.valid) {
        console.log(`[Migration] CPF/CNPJ inválido para userId=${userId}: ${cpfCnpj}`);
        return { success: false, error: 'CPF/CNPJ inválido' };
      }

      // 2. Buscar usuário
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, clerk_id, plan')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error(`[Migration] ❌ Erro ao buscar usuário ${userId}:`, userError?.message || 'user is null', userError?.code);
        return { success: false, error: `Erro ao buscar usuário: ${userError?.message || 'não encontrado'}` };
      }

      console.log(`[Migration] ✅ Usuário encontrado: ${user.email}, plano: ${user.plan}`);

      // 3. Buscar item na fila de migração
      const { data: migrationItem, error: mqError } = await supabaseAdmin
        .from('migration_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (mqError || !migrationItem) {
        console.error(`[Migration] ❌ Fila de migração não encontrada para ${userId}:`, mqError?.message || 'item is null', mqError?.code);
        return { success: false, error: 'Nenhuma migração pendente encontrada para sua conta' };
      }

      console.log(`[Migration] ✅ Item de migração: tipo=${migrationItem.migration_type}, plano=${migrationItem.current_plan}`);

      // 4. Verificar se já existe cliente no Asaas por CPF
      let asaasCustomer = await AsaasCustomerService.getByCpfCnpj(validation.cleaned);

      // 5. Se não existe, criar cliente no Asaas
      if (!asaasCustomer) {
        asaasCustomer = await AsaasCustomerService.create({
          name: name || user.name || 'Cliente StencilFlow',
          cpfCnpj: validation.cleaned,
          email: user.email,
          mobilePhone: phone,
          externalReference: user.clerk_id,
          notificationDisabled: false,
        });
      }

      // 6. Verificar se já tem assinatura ativa
      const existingSubscription = await AsaasSubscriptionService.getActiveByCustomerId(asaasCustomer.id);

      let subscription;
      if (existingSubscription) {
        // Já tem assinatura, usar ela
        subscription = existingSubscription;
      } else {
        // 7. Criar assinatura no Asaas com billing_day correto
        const plan = migrationItem.current_plan || user.plan || 'starter';
        const planConfig = ASAAS_PLANS[plan];

        if (!planConfig) {
          return { success: false, error: `Plano inválido: ${plan}` };
        }

        const nextDueDate = this.calculateNextDueDate(migrationItem.billing_day);

        subscription = await AsaasSubscriptionService.create({
          customer: asaasCustomer.id,
          billingType: 'PIX', // Usar PIX como default, usuário pode trocar depois
          value: planConfig.prices.monthly,
          nextDueDate,
          cycle: 'MONTHLY',
          description: `StencilFlow ${planConfig.name} - Mensal`,
          externalReference: user.clerk_id,
        });
      }

      // 8. Atualizar migration_queue
      await supabaseAdmin
        .from('migration_queue')
        .update({
          status: 'migrated',
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: subscription.id,
          migrated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', migrationItem.id);

      // 9. Atualizar users
      await supabaseAdmin
        .from('users')
        .update({
          cpf_cnpj: validation.cleaned,
          requires_cpf: false,
          migration_status: 'migrated',
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: subscription.id,
          is_paid: true,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // 10. Salvar/atualizar customer no banco
      await supabaseAdmin
        .from('customers')
        .upsert({
          user_id: userId,
          asaas_customer_id: asaasCustomer.id,
          email: user.email,
          nome: name || user.name,
          cpf_cnpj: validation.cleaned,
          phone,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      console.log(`[Migration] Usuário migrado com sucesso: ${user.email} -> ${asaasCustomer.id}`);

      return {
        success: true,
        asaasCustomerId: asaasCustomer.id,
        asaasSubscriptionId: subscription.id,
      };

    } catch (error) {
      console.error('[Migration] Erro ao processar migração:', error);

      // Registrar erro na migration_queue
      await supabaseAdmin
        .from('migration_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar migração',
      };
    }
  }

  /**
   * Retorna estatísticas da migração
   */
  static async getMigrationStats(): Promise<{
    total: number;
    pending: number;
    migrated: number;
    failed: number;
    skipped: number;
    byType: {
      pagante: number;
      cortesia_pagou: number;
      cortesia_nunca_pagou: number;
    };
  }> {
    const { data: items } = await supabaseAdmin
      .from('migration_queue')
      .select('status, migration_type');

    if (!items) {
      return {
        total: 0,
        pending: 0,
        migrated: 0,
        failed: 0,
        skipped: 0,
        byType: { pagante: 0, cortesia_pagou: 0, cortesia_nunca_pagou: 0 },
      };
    }

    const stats = {
      total: items.length,
      pending: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      byType: {
        pagante: 0,
        cortesia_pagou: 0,
        cortesia_nunca_pagou: 0,
      },
    };

    items.forEach((item: { status: string; migration_type: string }) => {
      // Por status
      if (item.status === 'pending') stats.pending++;
      else if (item.status === 'migrated') stats.migrated++;
      else if (item.status === 'failed') stats.failed++;
      else if (item.status === 'skipped') stats.skipped++;

      // Por tipo
      if (item.migration_type === 'pagante') stats.byType.pagante++;
      else if (item.migration_type === 'cortesia_pagou') stats.byType.cortesia_pagou++;
      else if (item.migration_type === 'cortesia_nunca_pagou') stats.byType.cortesia_nunca_pagou++;
    });

    return stats;
  }
}
