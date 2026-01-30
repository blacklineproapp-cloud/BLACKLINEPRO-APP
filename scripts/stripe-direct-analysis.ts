/**
 * Análise DIRETA da API do Stripe
 * Busca todos os dados reais de assinaturas e pagamentos
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

interface SubscriptionData {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string | null;
  status: string;
  plan: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
  monthlyAmount: number;
  currentPeriodEnd: Date;
  daysUntilRenewal: number;
  paymentMethod: string;
  paymentMethodDetails: string;
  created: Date;
  cancelAtPeriodEnd: boolean;
}

async function main() {
  console.log('🔍 Buscando dados DIRETO do Stripe...\n');

  // ==========================================
  // 1. BUSCAR TODAS AS ASSINATURAS
  // ==========================================
  console.log('📦 Carregando assinaturas...');

  const allSubscriptions: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer', 'data.default_payment_method'],
    });

    allSubscriptions.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  console.log(`   Total de assinaturas encontradas: ${allSubscriptions.length}\n`);

  // ==========================================
  // 2. PROCESSAR ASSINATURAS
  // ==========================================

  const subscriptions: SubscriptionData[] = [];
  const stats = {
    active: 0,
    trialing: 0,
    pastDue: 0,
    canceled: 0,
    unpaid: 0,
    incomplete: 0,
    other: 0,
  };

  const mrrByPlan: Record<string, number> = {};
  const mrrByPaymentMethod: Record<string, number> = {};
  const usersByPlan: Record<string, number> = {};
  const usersByPaymentMethod: Record<string, number> = {};
  let totalMRR = 0;

  for (const sub of allSubscriptions) {
    const customer = sub.customer as Stripe.Customer;
    const item = sub.items.data[0];
    const price = item.price;

    // Calcular valor mensal
    let monthlyAmount = (price.unit_amount || 0) / 100;
    const interval = price.recurring?.interval || 'month';
    const intervalCount = price.recurring?.interval_count || 1;

    if (interval === 'year') {
      monthlyAmount = monthlyAmount / 12;
    } else if (interval === 'month' && intervalCount > 1) {
      monthlyAmount = monthlyAmount / intervalCount;
    }

    // Identificar plano pelo preço
    let planName = 'unknown';
    if (monthlyAmount >= 250) planName = 'studio';
    else if (monthlyAmount >= 80) planName = 'pro';
    else if (monthlyAmount >= 40) planName = 'starter';
    else if (monthlyAmount >= 20) planName = 'legacy';
    else if (monthlyAmount > 0) planName = 'other';

    // Identificar método de pagamento
    let paymentMethod = 'unknown';
    let paymentMethodDetails = '';

    if (sub.default_payment_method) {
      const pm = sub.default_payment_method as Stripe.PaymentMethod;
      paymentMethod = pm.type;
      if (pm.type === 'card' && pm.card) {
        paymentMethodDetails = `${pm.card.brand} ****${pm.card.last4}`;
      } else if (pm.type === 'boleto') {
        paymentMethodDetails = 'Boleto Bancário';
      }
    } else if (sub.collection_method === 'send_invoice') {
      paymentMethod = 'boleto';
      paymentMethodDetails = 'Boleto (invoice)';
    }

    // Calcular dias até renovação
    const now = new Date();
    const periodEnd = new Date(sub.current_period_end * 1000);
    const daysUntilRenewal = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const data: SubscriptionData = {
      id: sub.id,
      customerId: customer.id,
      customerEmail: customer.email || 'N/A',
      customerName: customer.name,
      status: sub.status,
      plan: planName,
      priceId: price.id,
      amount: (price.unit_amount || 0) / 100,
      currency: price.currency,
      interval: `${intervalCount} ${interval}`,
      monthlyAmount,
      currentPeriodEnd: periodEnd,
      daysUntilRenewal,
      paymentMethod,
      paymentMethodDetails,
      created: new Date(sub.created * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };

    subscriptions.push(data);

    // Contabilizar status
    switch (sub.status) {
      case 'active': stats.active++; break;
      case 'trialing': stats.trialing++; break;
      case 'past_due': stats.pastDue++; break;
      case 'canceled': stats.canceled++; break;
      case 'unpaid': stats.unpaid++; break;
      case 'incomplete': stats.incomplete++; break;
      default: stats.other++;
    }

    // Contabilizar MRR apenas para assinaturas ativas
    if (['active', 'trialing'].includes(sub.status)) {
      totalMRR += monthlyAmount;
      mrrByPlan[planName] = (mrrByPlan[planName] || 0) + monthlyAmount;
      mrrByPaymentMethod[paymentMethod] = (mrrByPaymentMethod[paymentMethod] || 0) + monthlyAmount;
      usersByPlan[planName] = (usersByPlan[planName] || 0) + 1;
      usersByPaymentMethod[paymentMethod] = (usersByPaymentMethod[paymentMethod] || 0) + 1;
    }
  }

  // ==========================================
  // 3. BUSCAR PAGAMENTOS RECENTES
  // ==========================================
  console.log('💳 Carregando pagamentos recentes (últimos 30 dias)...');

  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  const payments = await stripe.paymentIntents.list({
    limit: 100,
    created: { gte: thirtyDaysAgo },
  });

  const successfulPayments = payments.data.filter(p => p.status === 'succeeded');
  const totalRevenue30Days = successfulPayments.reduce((sum, p) => sum + (p.amount / 100), 0);

  console.log(`   Pagamentos bem-sucedidos: ${successfulPayments.length}`);
  console.log(`   Receita últimos 30 dias: R$ ${totalRevenue30Days.toFixed(2)}\n`);

  // ==========================================
  // 4. EXIBIR RELATÓRIO
  // ==========================================

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('            📊 RELATÓRIO STRIPE - DADOS REAIS DA API                   ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('📈 STATUS DAS ASSINATURAS');
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log(`  ✅ ATIVAS:              ${stats.active}`);
  console.log(`  🎁 TRIAL:               ${stats.trialing}`);
  console.log(`  ⚠️  PAST DUE:            ${stats.pastDue}`);
  console.log(`  ❌ CANCELADAS:          ${stats.canceled}`);
  console.log(`  💸 UNPAID:              ${stats.unpaid}`);
  console.log(`  ⏳ INCOMPLETE:          ${stats.incomplete}`);
  console.log(`  ❓ OUTROS:              ${stats.other}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  📊 TOTAL:               ${allSubscriptions.length}`);
  console.log('');

  const activeCount = stats.active + stats.trialing;
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log(`║  💰 MRR REAL (${activeCount} assinaturas ativas):                       ║`);
  console.log(`║                                                                   ║`);
  console.log(`║     R$ ${totalMRR.toFixed(2).padStart(10)}  /mês                                  ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('💰 MRR POR PLANO');
  console.log('─────────────────────────────────────────────────────────────────────');
  Object.entries(mrrByPlan)
    .sort((a, b) => b[1] - a[1])
    .forEach(([plan, mrr]) => {
      const users = usersByPlan[plan] || 0;
      const bar = '█'.repeat(Math.ceil(mrr / 100));
      console.log(`  ${plan.padEnd(12)} ${bar.padEnd(30)} R$ ${mrr.toFixed(2).padStart(8)} (${users} usuários)`);
    });
  console.log('');

  console.log('💳 MRR POR MÉTODO DE PAGAMENTO');
  console.log('─────────────────────────────────────────────────────────────────────');
  Object.entries(mrrByPaymentMethod)
    .sort((a, b) => b[1] - a[1])
    .forEach(([method, mrr]) => {
      const users = usersByPaymentMethod[method] || 0;
      const bar = '█'.repeat(Math.ceil(mrr / 100));
      console.log(`  ${method.padEnd(12)} ${bar.padEnd(30)} R$ ${mrr.toFixed(2).padStart(8)} (${users} usuários)`);
    });
  console.log('');

  console.log('👥 USUÁRIOS PAGANTES POR PLANO');
  console.log('─────────────────────────────────────────────────────────────────────');
  Object.entries(usersByPlan)
    .sort((a, b) => b[1] - a[1])
    .forEach(([plan, count]) => {
      const bar = '█'.repeat(count);
      console.log(`  ${plan.padEnd(12)} ${bar.padEnd(40)} ${count}`);
    });
  console.log('');

  // Renovações próximas
  const activeSubscriptions = subscriptions.filter(s => ['active', 'trialing'].includes(s.status));
  const next7Days = activeSubscriptions.filter(s => s.daysUntilRenewal <= 7 && s.daysUntilRenewal >= 0);
  const next30Days = activeSubscriptions.filter(s => s.daysUntilRenewal <= 30 && s.daysUntilRenewal >= 0);
  const overdue = activeSubscriptions.filter(s => s.daysUntilRenewal < 0);

  console.log('📅 RENOVAÇÕES');
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log(`  ⚠️  Próximos 7 dias:     ${next7Days.length} assinaturas`);
  console.log(`  📆 Próximos 30 dias:    ${next30Days.length} assinaturas`);
  console.log(`  🚨 Vencidas (overdue):  ${overdue.length} assinaturas`);
  console.log('');

  if (next7Days.length > 0) {
    console.log('  📋 Renovando em até 7 dias:');
    next7Days
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
      .forEach(s => {
        console.log(`     • ${s.customerEmail.padEnd(35)} ${s.plan.padEnd(8)} ${s.paymentMethod.padEnd(8)} ${s.daysUntilRenewal}d`);
      });
    console.log('');
  }

  // Lista completa de assinaturas ativas
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('           📋 LISTA COMPLETA - ASSINATURAS ATIVAS                      ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('Email                                    Plano      Valor/mês   Método     Renova em');
  console.log('─────────────────────────────────────────────────────────────────────────────────────');

  activeSubscriptions
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
    .forEach(s => {
      const email = s.customerEmail.substring(0, 38).padEnd(40);
      const plan = s.plan.padEnd(10);
      const amount = `R$ ${s.monthlyAmount.toFixed(2)}`.padStart(10);
      const method = s.paymentMethod.padEnd(10);
      const days = `${s.daysUntilRenewal}d`.padStart(6);
      console.log(`${email} ${plan} ${amount} ${method} ${days}`);
    });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('                         📊 RESUMO FINAL                               ');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  🎯 Total de Assinaturas:        ${allSubscriptions.length}`);
  console.log(`  ✅ Assinaturas Ativas:          ${activeCount}`);
  console.log(`  💰 MRR Total:                   R$ ${totalMRR.toFixed(2)}`);
  console.log(`  💳 Receita últimos 30 dias:     R$ ${totalRevenue30Days.toFixed(2)}`);
  console.log('');

  // Salvar JSON
  const fs = await import('fs');
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSubscriptions: allSubscriptions.length,
      activeSubscriptions: activeCount,
      mrr: totalMRR,
      revenue30Days: totalRevenue30Days,
    },
    stats,
    mrrByPlan,
    mrrByPaymentMethod,
    usersByPlan,
    usersByPaymentMethod,
    subscriptions: activeSubscriptions.map(s => ({
      email: s.customerEmail,
      plan: s.plan,
      monthlyAmount: s.monthlyAmount,
      paymentMethod: s.paymentMethod,
      daysUntilRenewal: s.daysUntilRenewal,
      status: s.status,
    })),
  };

  fs.writeFileSync('./scripts/stripe-real-data.json', JSON.stringify(report, null, 2));
  console.log('💾 Dados salvos em: ./scripts/stripe-real-data.json');
  console.log('');
}

main().catch(console.error);
