#!/usr/bin/env npx tsx
/**
 * Script de Análise: Datas de Cobrança para Migração Asaas
 *
 * Este script analisa:
 * 1. Usuários que pagaram no Stripe - busca PRIMEIRO pagamento para definir dia de recorrência
 * 2. Cortesias que pagaram - mesmo tratamento
 * 3. Cortesias que nunca pagaram - usa admin_courtesy_granted_at + 30 dias
 *
 * Output: Lista organizada com data de próxima cobrança no Asaas
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface UserBillingInfo {
  email: string;
  name: string | null;
  plan: string;
  type: 'pagante' | 'cortesia_pagou' | 'cortesia_nunca_pagou';
  // Dados do Stripe
  stripeCustomerId: string | null;
  firstPaymentDate: Date | null;
  lastPaymentDate: Date | null;
  totalPayments: number;
  // Dados de cortesia
  isCourtesy: boolean;
  courtesyGrantedAt: Date | null;
  // Cálculo final
  billingDay: number; // Dia do mês para cobrança
  nextDueDate: string; // Próxima data de cobrança (YYYY-MM-DD)
}

/**
 * Busca TODOS os pagamentos de um customer no Stripe
 */
async function getCustomerPayments(customerId: string): Promise<{ first: Date | null; last: Date | null; count: number }> {
  const payments: Date[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Stripe.ChargeListParams = {
      customer: customerId,
      limit: 100,
    };
    if (startingAfter) params.starting_after = startingAfter;

    const charges = await stripe.charges.list(params);

    for (const charge of charges.data) {
      if (charge.status === 'succeeded') {
        payments.push(new Date(charge.created * 1000));
      }
    }

    hasMore = charges.has_more;
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
  }

  if (payments.length === 0) {
    return { first: null, last: null, count: 0 };
  }

  // Ordenar por data (mais antigo primeiro)
  payments.sort((a, b) => a.getTime() - b.getTime());

  return {
    first: payments[0],
    last: payments[payments.length - 1],
    count: payments.length,
  };
}

/**
 * Busca todos os customers do Stripe que fizeram pagamento
 */
async function getStripeCustomersWithPayments(): Promise<Map<string, { customerId: string; email: string; name: string | null }>> {
  const customersMap = new Map<string, { customerId: string; email: string; name: string | null }>();

  console.log('🔍 Buscando pagamentos no Stripe...');

  let hasMore = true;
  let startingAfter: string | undefined;
  let totalCharges = 0;

  while (hasMore) {
    const params: Stripe.ChargeListParams = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;

    const charges = await stripe.charges.list(params);
    totalCharges += charges.data.length;

    for (const charge of charges.data) {
      if (charge.status !== 'succeeded' || !charge.customer) continue;

      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer.id;

      if (!customersMap.has(customerId)) {
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          if (customer.email && !customer.deleted) {
            customersMap.set(customerId, {
              customerId,
              email: customer.email.toLowerCase().trim(),
              name: customer.name,
            });
          }
        } catch {}
      }
    }

    hasMore = charges.has_more;
    if (charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }

    process.stdout.write(`\r   Processados ${totalCharges} charges, ${customersMap.size} customers únicos...`);
  }

  console.log(`\n   ✅ Total: ${customersMap.size} customers com pagamentos`);
  return customersMap;
}

/**
 * Calcula próxima data de cobrança baseado no dia de recorrência
 */
function calculateNextDueDate(billingDay: number): string {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let nextMonth = currentMonth;
  let nextYear = currentYear;

  // Se o dia de cobrança já passou neste mês, vai para o próximo
  if (currentDay >= billingDay) {
    nextMonth++;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
  }

  // Ajustar para meses com menos dias
  const daysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const adjustedDay = Math.min(billingDay, daysInMonth);

  const nextDate = new Date(nextYear, nextMonth, adjustedDay);
  return nextDate.toISOString().split('T')[0];
}

/**
 * Função principal
 */
async function main() {
  console.log('📊 ANÁLISE DE DATAS DE COBRANÇA PARA MIGRAÇÃO ASAAS\n');
  console.log('='.repeat(70));

  // 1. Buscar todos os usuários do banco
  console.log('\n📦 Buscando usuários do banco de dados...');
  const { data: dbUsers, error } = await supabase
    .from('users')
    .select('id, email, name, plan, is_paid, admin_courtesy, admin_courtesy_granted_at, payment_source')
    .order('created_at', { ascending: false });

  if (error || !dbUsers) {
    console.error('❌ Erro ao buscar usuários:', error);
    return;
  }

  console.log(`   ✅ Total de usuários: ${dbUsers.length}`);

  // 2. Buscar customers do Stripe
  const stripeCustomers = await getStripeCustomersWithPayments();

  // Criar mapa de email -> customer
  const emailToStripeCustomer = new Map<string, { customerId: string; email: string; name: string | null }>();
  for (const customer of stripeCustomers.values()) {
    emailToStripeCustomer.set(customer.email, customer);
  }

  // 3. Processar cada usuário
  console.log('\n🔄 Analisando datas de pagamento de cada usuário...\n');

  const results: UserBillingInfo[] = [];
  let processed = 0;

  for (const user of dbUsers) {
    const email = user.email?.toLowerCase().trim();
    if (!email) continue;

    const stripeCustomer = emailToStripeCustomer.get(email);
    const isCourtesy = user.admin_courtesy === true;
    const courtesyGrantedAt = user.admin_courtesy_granted_at ? new Date(user.admin_courtesy_granted_at) : null;

    let userInfo: UserBillingInfo = {
      email,
      name: user.name,
      plan: user.plan || 'free',
      type: 'cortesia_nunca_pagou',
      stripeCustomerId: null,
      firstPaymentDate: null,
      lastPaymentDate: null,
      totalPayments: 0,
      isCourtesy,
      courtesyGrantedAt,
      billingDay: 1,
      nextDueDate: '',
    };

    // Se tem customer no Stripe, buscar pagamentos
    if (stripeCustomer) {
      userInfo.stripeCustomerId = stripeCustomer.customerId;

      const payments = await getCustomerPayments(stripeCustomer.customerId);
      userInfo.firstPaymentDate = payments.first;
      userInfo.lastPaymentDate = payments.last;
      userInfo.totalPayments = payments.count;

      if (payments.count > 0) {
        userInfo.type = isCourtesy ? 'cortesia_pagou' : 'pagante';
        // Dia de cobrança = dia do PRIMEIRO pagamento
        userInfo.billingDay = payments.first!.getDate();
      }
    }

    // Calcular próxima cobrança
    if (userInfo.totalPayments > 0) {
      // Usuário pagou: usar dia do primeiro pagamento
      userInfo.nextDueDate = calculateNextDueDate(userInfo.billingDay);
    } else if (isCourtesy && courtesyGrantedAt) {
      // Cortesia que nunca pagou: 30 dias após liberação
      const dueDate = new Date(courtesyGrantedAt);
      dueDate.setDate(dueDate.getDate() + 30);

      // Se já passou, calcular próxima recorrência
      const today = new Date();
      if (dueDate < today) {
        userInfo.billingDay = courtesyGrantedAt.getDate();
        userInfo.nextDueDate = calculateNextDueDate(userInfo.billingDay);
      } else {
        userInfo.billingDay = dueDate.getDate();
        userInfo.nextDueDate = dueDate.toISOString().split('T')[0];
      }
    }

    // Só incluir se tem data de cobrança definida
    if (userInfo.nextDueDate && userInfo.plan !== 'free') {
      results.push(userInfo);
    }

    processed++;
    if (processed % 20 === 0) {
      process.stdout.write(`\r   Processados ${processed}/${dbUsers.length} usuários...`);
    }
  }

  console.log(`\r   ✅ Processados ${processed} usuários                    \n`);

  // 4. Separar e exibir resultados
  const pagantes = results.filter(r => r.type === 'pagante');
  const cortesiaPagou = results.filter(r => r.type === 'cortesia_pagou');
  const cortesiaNuncaPagou = results.filter(r => r.type === 'cortesia_nunca_pagou');

  // Ordenar por próxima data de cobrança
  const sortByNextDue = (a: UserBillingInfo, b: UserBillingInfo) =>
    a.nextDueDate.localeCompare(b.nextDueDate);

  pagantes.sort(sortByNextDue);
  cortesiaPagou.sort(sortByNextDue);
  cortesiaNuncaPagou.sort(sortByNextDue);

  console.log('='.repeat(70));
  console.log('📊 RESUMO\n');
  console.log(`   💳 Pagantes (pagaram no Stripe): ${pagantes.length}`);
  console.log(`   🎁 Cortesias que pagaram: ${cortesiaPagou.length}`);
  console.log(`   🆓 Cortesias que nunca pagaram: ${cortesiaNuncaPagou.length}`);
  console.log(`   📝 Total para migrar: ${results.length}`);

  // Exibir pagantes
  if (pagantes.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('💳 PAGANTES (pagaram no Stripe)\n');
    console.log('Email                                      | Plano   | 1º Pag.    | Dia | Próx. Cobrança');
    console.log('-'.repeat(95));

    for (const user of pagantes) {
      const firstPay = user.firstPaymentDate?.toISOString().split('T')[0] || 'N/A';
      console.log(
        `${user.email.padEnd(42)} | ${user.plan.padEnd(7)} | ${firstPay} | ${String(user.billingDay).padStart(2, '0')}  | ${user.nextDueDate}`
      );
    }
  }

  // Exibir cortesias que pagaram
  if (cortesiaPagou.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🎁 CORTESIAS QUE PAGARAM\n');
    console.log('Email                                      | Plano   | 1º Pag.    | Dia | Próx. Cobrança');
    console.log('-'.repeat(95));

    for (const user of cortesiaPagou) {
      const firstPay = user.firstPaymentDate?.toISOString().split('T')[0] || 'N/A';
      console.log(
        `${user.email.padEnd(42)} | ${user.plan.padEnd(7)} | ${firstPay} | ${String(user.billingDay).padStart(2, '0')}  | ${user.nextDueDate}`
      );
    }
  }

  // Exibir cortesias que nunca pagaram
  if (cortesiaNuncaPagou.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🆓 CORTESIAS QUE NUNCA PAGARAM (30 dias após liberação)\n');
    console.log('Email                                      | Plano   | Liberado   | Dia | Próx. Cobrança');
    console.log('-'.repeat(95));

    for (const user of cortesiaNuncaPagou) {
      const grantedAt = user.courtesyGrantedAt?.toISOString().split('T')[0] || 'N/A';
      console.log(
        `${user.email.padEnd(42)} | ${user.plan.padEnd(7)} | ${grantedAt} | ${String(user.billingDay).padStart(2, '0')}  | ${user.nextDueDate}`
      );
    }
  }

  // 5. Exportar para CSV
  const fs = await import('fs');
  const path = await import('path');

  const csvLines = [
    'email,nome,plano,tipo,stripe_customer_id,primeiro_pagamento,ultimo_pagamento,total_pagamentos,cortesia,cortesia_liberada_em,dia_cobranca,proxima_cobranca'
  ];

  for (const user of results) {
    csvLines.push([
      user.email,
      (user.name || '').replace(/,/g, ' '),
      user.plan,
      user.type,
      user.stripeCustomerId || '',
      user.firstPaymentDate?.toISOString().split('T')[0] || '',
      user.lastPaymentDate?.toISOString().split('T')[0] || '',
      user.totalPayments.toString(),
      user.isCourtesy ? 'sim' : 'nao',
      user.courtesyGrantedAt?.toISOString().split('T')[0] || '',
      user.billingDay.toString(),
      user.nextDueDate,
    ].join(','));
  }

  const csvPath = path.resolve(process.cwd(), 'billing-dates-analysis.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log(`📁 Relatório CSV exportado: ${csvPath}`);
  console.log('='.repeat(70));
}

main().catch(console.error);
