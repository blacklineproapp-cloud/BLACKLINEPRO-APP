/**
 * Script de Análise para Migração Stripe → Asaas
 *
 * Analisa:
 * 1. Usuários pagantes ativos
 * 2. Datas de renovação
 * 3. Métodos de pagamento
 * 4. MRR (Monthly Recurring Revenue)
 *
 * Uso: npx ts-node scripts/analyze-migration-data.ts
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserAnalysis {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  expiresAt: Date | null;
  daysUntilRenewal: number | null;
  paymentMethod: string;
  lastPaymentAmount: number | null;
  monthlyValue: number;
  isCourtesy: boolean;
  stripeCustomerId: string | null;
}

interface MigrationReport {
  generatedAt: string;
  summary: {
    totalUsers: number;
    paidUsers: number;
    courtesyUsers: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    noSubscription: number;
  };
  mrr: {
    total: number;
    byPlan: Record<string, number>;
    byPaymentMethod: Record<string, number>;
  };
  renewals: {
    next7Days: UserAnalysis[];
    next30Days: UserAnalysis[];
    next90Days: UserAnalysis[];
  };
  paymentMethods: {
    card: number;
    boleto: number;
    pix: number;
    unknown: number;
  };
  byPlan: Record<string, number>;
  users: UserAnalysis[];
}

async function analyzeStripeSubscription(subscriptionId: string): Promise<{
  status: string;
  currentPeriodEnd: Date;
  paymentMethod: string;
  amount: number;
  interval: string;
}> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'latest_invoice'],
    });

    let paymentMethod = 'unknown';

    // Verificar método de pagamento
    if (subscription.default_payment_method) {
      const pm = subscription.default_payment_method as Stripe.PaymentMethod;
      if (pm.type === 'card') {
        paymentMethod = 'card';
      } else if (pm.type === 'boleto') {
        paymentMethod = 'boleto';
      } else {
        paymentMethod = pm.type;
      }
    } else if (subscription.latest_invoice) {
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if (invoice.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
          if (pi.payment_method_types?.includes('boleto')) {
            paymentMethod = 'boleto';
          } else if (pi.payment_method_types?.includes('card')) {
            paymentMethod = 'card';
          }
        } catch (e) {
          // Ignorar erro
        }
      }
    }

    // Calcular valor mensal
    const item = subscription.items.data[0];
    let monthlyAmount = (item.price.unit_amount || 0) / 100;

    // Ajustar para mensal se for outro intervalo
    const interval = item.price.recurring?.interval || 'month';
    const intervalCount = item.price.recurring?.interval_count || 1;

    if (interval === 'year') {
      monthlyAmount = monthlyAmount / 12;
    } else if (interval === 'month' && intervalCount === 3) {
      monthlyAmount = monthlyAmount / 3;
    } else if (interval === 'month' && intervalCount === 6) {
      monthlyAmount = monthlyAmount / 6;
    }

    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      paymentMethod,
      amount: monthlyAmount,
      interval: `${intervalCount} ${interval}`,
    };
  } catch (error: any) {
    console.error(`Erro ao buscar subscription ${subscriptionId}:`, error.message);
    return {
      status: 'error',
      currentPeriodEnd: new Date(),
      paymentMethod: 'unknown',
      amount: 0,
      interval: 'unknown',
    };
  }
}

async function getStripeCustomerPaymentMethod(customerId: string): Promise<string> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      limit: 1,
    });

    if (paymentMethods.data.length > 0) {
      return paymentMethods.data[0].type;
    }
    return 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

async function main() {
  console.log('🔍 Iniciando análise de migração Stripe → Asaas...\n');

  // 1. Buscar todos os usuários do banco
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      plan,
      is_paid,
      subscription_id,
      subscription_status,
      subscription_expires_at,
      admin_courtesy,
      admin_courtesy_expires_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    process.exit(1);
  }

  console.log(`📊 Total de usuários no banco: ${users.length}\n`);

  // 2. Buscar customers do Stripe vinculados
  const { data: customers } = await supabase
    .from('customers')
    .select('user_id, stripe_customer_id');

  const customerMap = new Map<string, string>();
  customers?.forEach(c => {
    if (c.stripe_customer_id) {
      customerMap.set(c.user_id, c.stripe_customer_id);
    }
  });

  // 3. Buscar pagamentos recentes
  const { data: payments } = await supabase
    .from('payments')
    .select('user_id, amount, payment_method, status, created_at')
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false });

  const lastPaymentMap = new Map<string, { amount: number; method: string }>();
  payments?.forEach(p => {
    if (!lastPaymentMap.has(p.user_id) && p.user_id) {
      lastPaymentMap.set(p.user_id, { amount: p.amount, method: p.payment_method });
    }
  });

  // 4. Analisar cada usuário
  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers: users.length,
      paidUsers: 0,
      courtesyUsers: 0,
      activeSubscriptions: 0,
      canceledSubscriptions: 0,
      noSubscription: 0,
    },
    mrr: {
      total: 0,
      byPlan: {},
      byPaymentMethod: {},
    },
    renewals: {
      next7Days: [],
      next30Days: [],
      next90Days: [],
    },
    paymentMethods: {
      card: 0,
      boleto: 0,
      pix: 0,
      unknown: 0,
    },
    byPlan: {},
    users: [],
  };

  // Preços por plano (para estimar MRR)
  const planPrices: Record<string, number> = {
    'free': 0,
    'legacy': 25,
    'starter': 50,
    'pro': 100,
    'studio': 300,
    'enterprise': 600,
  };

  console.log('🔄 Analisando usuários pagantes...\n');

  for (const user of users) {
    // Verificar se é cortesia ativa
    const isCourtesy = user.admin_courtesy &&
      user.admin_courtesy_expires_at &&
      new Date(user.admin_courtesy_expires_at) > new Date();

    if (isCourtesy) {
      report.summary.courtesyUsers++;
    }

    // Só processar usuários pagos ou com assinatura
    if (!user.is_paid && !user.subscription_id && !isCourtesy) {
      continue;
    }

    const analysis: UserAnalysis = {
      id: user.id,
      email: user.email || 'N/A',
      name: user.name,
      plan: user.plan || 'unknown',
      subscriptionId: user.subscription_id,
      subscriptionStatus: user.subscription_status,
      expiresAt: user.subscription_expires_at ? new Date(user.subscription_expires_at) : null,
      daysUntilRenewal: null,
      paymentMethod: 'unknown',
      lastPaymentAmount: null,
      monthlyValue: planPrices[user.plan] || 0,
      isCourtesy,
      stripeCustomerId: customerMap.get(user.id) || null,
    };

    // Buscar dados do Stripe se tiver subscription
    if (user.subscription_id && user.subscription_id.startsWith('sub_')) {
      const stripeData = await analyzeStripeSubscription(user.subscription_id);

      analysis.subscriptionStatus = stripeData.status;
      analysis.expiresAt = stripeData.currentPeriodEnd;
      analysis.paymentMethod = stripeData.paymentMethod;
      analysis.monthlyValue = stripeData.amount || planPrices[user.plan] || 0;

      // Calcular dias até renovação
      if (stripeData.currentPeriodEnd) {
        const now = new Date();
        const diffTime = stripeData.currentPeriodEnd.getTime() - now.getTime();
        analysis.daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Contar status
      if (['active', 'trialing'].includes(stripeData.status)) {
        report.summary.activeSubscriptions++;
      } else if (['canceled', 'unpaid', 'past_due'].includes(stripeData.status)) {
        report.summary.canceledSubscriptions++;
      }
    } else {
      report.summary.noSubscription++;
    }

    // Usar dados do último pagamento se não tiver do Stripe
    if (analysis.paymentMethod === 'unknown' && lastPaymentMap.has(user.id)) {
      const lastPayment = lastPaymentMap.get(user.id)!;
      analysis.paymentMethod = lastPayment.method || 'unknown';
      analysis.lastPaymentAmount = lastPayment.amount;
    }

    // Contabilizar se é pagante real (não cortesia)
    if (user.is_paid && !isCourtesy) {
      report.summary.paidUsers++;

      // MRR
      report.mrr.total += analysis.monthlyValue;
      report.mrr.byPlan[analysis.plan] = (report.mrr.byPlan[analysis.plan] || 0) + analysis.monthlyValue;
      report.mrr.byPaymentMethod[analysis.paymentMethod] =
        (report.mrr.byPaymentMethod[analysis.paymentMethod] || 0) + analysis.monthlyValue;

      // Método de pagamento
      if (analysis.paymentMethod === 'card') {
        report.paymentMethods.card++;
      } else if (analysis.paymentMethod === 'boleto') {
        report.paymentMethods.boleto++;
      } else if (analysis.paymentMethod === 'pix') {
        report.paymentMethods.pix++;
      } else {
        report.paymentMethods.unknown++;
      }

      // Por plano
      report.byPlan[analysis.plan] = (report.byPlan[analysis.plan] || 0) + 1;

      // Renovações próximas
      if (analysis.daysUntilRenewal !== null) {
        if (analysis.daysUntilRenewal <= 7) {
          report.renewals.next7Days.push(analysis);
        }
        if (analysis.daysUntilRenewal <= 30) {
          report.renewals.next30Days.push(analysis);
        }
        if (analysis.daysUntilRenewal <= 90) {
          report.renewals.next90Days.push(analysis);
        }
      }
    }

    report.users.push(analysis);
  }

  // Ordenar renovações por data
  report.renewals.next7Days.sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  report.renewals.next30Days.sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  report.renewals.next90Days.sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));

  // ==========================================
  // EXIBIR RELATÓRIO
  // ==========================================

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    📊 RELATÓRIO DE MIGRAÇÃO                    ');
  console.log('                    Stripe → Asaas                              ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📈 RESUMO GERAL');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Total de usuários:          ${report.summary.totalUsers}`);
  console.log(`  Usuários PAGANTES:          ${report.summary.paidUsers}`);
  console.log(`  Usuários com CORTESIA:      ${report.summary.courtesyUsers}`);
  console.log(`  Assinaturas ATIVAS:         ${report.summary.activeSubscriptions}`);
  console.log(`  Assinaturas CANCELADAS:     ${report.summary.canceledSubscriptions}`);
  console.log(`  Sem assinatura Stripe:      ${report.summary.noSubscription}`);
  console.log('');

  console.log('💰 MRR (Monthly Recurring Revenue)');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  MRR TOTAL:                  R$ ${report.mrr.total.toFixed(2)}`);
  console.log('');
  console.log('  Por Plano:');
  Object.entries(report.mrr.byPlan).forEach(([plan, value]) => {
    console.log(`    • ${plan.padEnd(15)} R$ ${value.toFixed(2)}`);
  });
  console.log('');
  console.log('  Por Método de Pagamento:');
  Object.entries(report.mrr.byPaymentMethod).forEach(([method, value]) => {
    console.log(`    • ${method.padEnd(15)} R$ ${value.toFixed(2)}`);
  });
  console.log('');

  console.log('💳 MÉTODOS DE PAGAMENTO');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Cartão de Crédito:          ${report.paymentMethods.card}`);
  console.log(`  Boleto:                     ${report.paymentMethods.boleto}`);
  console.log(`  PIX:                        ${report.paymentMethods.pix}`);
  console.log(`  Desconhecido:               ${report.paymentMethods.unknown}`);
  console.log('');

  console.log('📦 USUÁRIOS POR PLANO');
  console.log('───────────────────────────────────────────────────────────────');
  Object.entries(report.byPlan).forEach(([plan, count]) => {
    console.log(`  ${plan.padEnd(15)} ${count} usuários`);
  });
  console.log('');

  console.log('📅 RENOVAÇÕES PRÓXIMAS');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Próximos 7 dias:            ${report.renewals.next7Days.length} usuários`);
  console.log(`  Próximos 30 dias:           ${report.renewals.next30Days.length} usuários`);
  console.log(`  Próximos 90 dias:           ${report.renewals.next90Days.length} usuários`);
  console.log('');

  if (report.renewals.next7Days.length > 0) {
    console.log('  ⚠️  Renovando nos próximos 7 DIAS:');
    report.renewals.next7Days.forEach(u => {
      console.log(`      • ${u.email} (${u.plan}) - ${u.daysUntilRenewal} dias - ${u.paymentMethod}`);
    });
    console.log('');
  }

  if (report.renewals.next30Days.length > 0) {
    console.log('  📆 Renovando nos próximos 30 DIAS:');
    report.renewals.next30Days.slice(0, 10).forEach(u => {
      console.log(`      • ${u.email} (${u.plan}) - ${u.daysUntilRenewal} dias - ${u.paymentMethod}`);
    });
    if (report.renewals.next30Days.length > 10) {
      console.log(`      ... e mais ${report.renewals.next30Days.length - 10} usuários`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    🎯 RECOMENDAÇÕES                            ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Recomendações baseadas nos dados
  if (report.paymentMethods.boleto > 0) {
    console.log('✅ BOLETOS: Usuários com boleto podem migrar facilmente para Asaas.');
    console.log(`   → ${report.paymentMethods.boleto} usuários usam boleto\n`);
  }

  if (report.paymentMethods.card > 0) {
    console.log('⚠️  CARTÕES: Usuários com cartão precisarão recadastrar no Asaas.');
    console.log(`   → ${report.paymentMethods.card} usuários usam cartão`);
    console.log('   → Sugestão: Oferecer PIX com desconto na migração\n');
  }

  if (report.renewals.next7Days.length > 0) {
    console.log('🚨 URGENTE: Há usuários renovando em 7 dias!');
    console.log('   → Decidir se esses continuam no Stripe ou migram agora\n');
  }

  console.log('📋 ESTRATÉGIA SUGERIDA:');
  console.log('   1. Manter usuários atuais no Stripe até renovação');
  console.log('   2. Novos usuários vão direto para Asaas');
  console.log('   3. Na renovação, oferecer PIX com 10% de desconto');
  console.log('   4. Migração gradual ao longo de 3-6 meses\n');

  // Salvar relatório em JSON
  const reportPath = './scripts/migration-report.json';
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Relatório completo salvo em: ${reportPath}`);

  // Salvar CSV dos usuários pagantes
  const csvPath = './scripts/paying-users.csv';
  const csvHeader = 'email,name,plan,payment_method,monthly_value,expires_at,days_until_renewal,subscription_status\n';
  const csvRows = report.users
    .filter(u => !u.isCourtesy && u.monthlyValue > 0)
    .map(u =>
      `${u.email},${u.name || ''},${u.plan},${u.paymentMethod},${u.monthlyValue},${u.expiresAt?.toISOString() || ''},${u.daysUntilRenewal || ''},${u.subscriptionStatus || ''}`
    )
    .join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`📄 Lista de usuários pagantes salva em: ${csvPath}`);

  console.log('\n✅ Análise concluída!\n');
}

main().catch(console.error);
