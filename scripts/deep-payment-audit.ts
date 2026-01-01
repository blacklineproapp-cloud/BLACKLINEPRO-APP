import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY não configurada');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis Supabase não configuradas');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PaymentReport {
  email: string;
  nome: string;
  plano: string;
  ciclo: string;
  valor: string;
  status: string;
  dataInicio: string;
  dataProximaCobranca: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  metodoPagamento: string;
  ultimoPagamento: string;
  totalPago: number;
  fonte: 'stripe' | 'admin_manual';
}

async function deepPaymentAudit() {
  console.log('🔍 AUDITORIA PROFUNDA DE PAGAMENTOS STENCILFLOW');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  const reports: PaymentReport[] = [];

  // 1. Buscar TODAS as subscriptions ativas no Stripe
  console.log('📥 Buscando subscriptions no Stripe...');
  
  let subscriptions: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.subscriptions.list({
      limit: 100,
      status: 'all',
      starting_after: startingAfter,
      expand: ['data.customer', 'data.default_payment_method'],
    });
    
    subscriptions = [...subscriptions, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  console.log(`✅ ${subscriptions.length} subscriptions encontradas no Stripe\n`);

  // 2. Buscar dados complementares do banco
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, email, name, plan, is_paid, subscription_id, clerk_id');

  const userMap = new Map<string, any>();
  dbUsers?.forEach(u => {
    if (u.email) userMap.set(u.email.toLowerCase(), u);
  });

  // 3. Processar cada subscription
  for (const sub of subscriptions) {
    const customer = sub.customer as Stripe.Customer;
    const email = customer.email || 'N/A';
    const nome = customer.name || 'N/A';
    
    // Identificar plano pelo preço
    const priceId = sub.items.data[0]?.price?.id || '';
    let plano = 'desconhecido';
    let ciclo = 'mensal';
    
    // Mapear price IDs para planos
    const priceNickname = sub.items.data[0]?.price?.nickname?.toLowerCase() || '';
    const productName = (sub.items.data[0]?.price?.product as Stripe.Product)?.name?.toLowerCase() || '';
    
    if (priceNickname.includes('starter') || productName.includes('starter')) {
      plano = 'starter';
    } else if (priceNickname.includes('studio') || productName.includes('studio')) {
      plano = 'studio';
    } else if (priceNickname.includes('pro') || productName.includes('pro')) {
      plano = 'pro';
    } else if (priceNickname.includes('enterprise') || productName.includes('enterprise')) {
      plano = 'enterprise';
    }

    // Identificar ciclo
    const interval = sub.items.data[0]?.price?.recurring?.interval;
    const intervalCount = sub.items.data[0]?.price?.recurring?.interval_count || 1;
    
    if (interval === 'year') {
      ciclo = 'anual';
    } else if (interval === 'month') {
      if (intervalCount === 3) ciclo = 'trimestral';
      else if (intervalCount === 6) ciclo = 'semestral';
      else ciclo = 'mensal';
    }

    // Valor
    const unitAmount = sub.items.data[0]?.price?.unit_amount || 0;
    const valor = `R$ ${(unitAmount / 100).toFixed(2)}`;

    // Método de pagamento
    let metodoPagamento = 'N/A';
    const pm = sub.default_payment_method as Stripe.PaymentMethod | null;
    if (pm?.card) {
      metodoPagamento = `${pm.card.brand?.toUpperCase()} **** ${pm.card.last4}`;
    }

    // Buscar último pagamento
    let ultimoPagamento = 'N/A';
    let totalPago = 0;
    
    try {
      const invoices = await stripe.invoices.list({
        subscription: sub.id,
        limit: 100,
        status: 'paid',
      });
      
      if (invoices.data.length > 0) {
        const lastInvoice = invoices.data[0];
        ultimoPagamento = new Date(lastInvoice.created * 1000).toLocaleDateString('pt-BR');
        totalPago = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 100;
      }
    } catch (e) {
      // Ignorar erro de invoices
    }

    // Identificar fonte (admin manual ou pagamento real)
    const isManual = sub.metadata?.manual_activation === 'true';

    reports.push({
      email,
      nome,
      plano,
      ciclo,
      valor,
      status: sub.status,
      dataInicio: new Date(sub.created * 1000).toLocaleDateString('pt-BR'),
      dataProximaCobranca: sub.current_period_end 
        ? new Date(sub.current_period_end * 1000).toLocaleDateString('pt-BR')
        : 'N/A',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: sub.id,
      metodoPagamento,
      ultimoPagamento,
      totalPago,
      fonte: isManual ? 'admin_manual' : 'stripe',
    });
  }

  // 4. Separar por fonte e status
  // Considerando 'active', 'trialing', e 'incomplete' como ativos
  const activeStatuses = ['active', 'trialing'];
  const stripePaid = reports.filter(r => r.fonte === 'stripe' && activeStatuses.includes(r.status));
  const adminManual = reports.filter(r => r.fonte === 'admin_manual');
  const canceled = reports.filter(r => r.status === 'canceled');
  const pastDue = reports.filter(r => r.status === 'past_due');
  const incomplete = reports.filter(r => r.status === 'incomplete' || r.status === 'incomplete_expired');
  const allActive = reports.filter(r => activeStatuses.includes(r.status));

  // Debug: mostrar todos os status encontrados
  const statusCounts: Record<string, number> = {};
  reports.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  
  console.log('\n📋 STATUS DAS SUBSCRIPTIONS:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  // 5. Exibir relatórios
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO GERAL');
  console.log('='.repeat(80));
  console.log(`💳 Pagantes ativos (Stripe): ${stripePaid.length}`);
  console.log(`🔧 Ativados pelo Admin:      ${adminManual.length}`);
  console.log(`❌ Cancelados:               ${canceled.length}`);
  console.log(`⚠️  Pagamento atrasado:       ${pastDue.length}`);
  console.log(`💰 Total recebido (Stripe):  R$ ${reports.reduce((sum, r) => sum + r.totalPago, 0).toFixed(2)}`);

  // Lista detalhada - Pagantes Stripe
  console.log('\n\n' + '='.repeat(80));
  console.log('💳 PAGANTES VIA STRIPE (Ativos)');
  console.log('='.repeat(80));
  
  if (stripePaid.length === 0) {
    console.log('Nenhum pagante ativo via Stripe.');
  } else {
    for (const r of stripePaid) {
      console.log(`\n📧 ${r.email}`);
      console.log(`   Nome: ${r.nome}`);
      console.log(`   Plano: ${r.plano.toUpperCase()} (${r.ciclo})`);
      console.log(`   Valor: ${r.valor}`);
      console.log(`   Início: ${r.dataInicio} | Próxima cobrança: ${r.dataProximaCobranca}`);
      console.log(`   Cartão: ${r.metodoPagamento}`);
      console.log(`   Último pagamento: ${r.ultimoPagamento}`);
      console.log(`   Total pago: R$ ${r.totalPago.toFixed(2)}`);
      console.log(`   Sub ID: ${r.stripeSubscriptionId}`);
    }
  }

  // Lista detalhada - Admin Manual
  console.log('\n\n' + '='.repeat(80));
  console.log('🔧 ATIVADOS PELO ADMIN (Manuais)');
  console.log('='.repeat(80));
  
  if (adminManual.length === 0) {
    console.log('Nenhum usuário ativado manualmente.');
  } else {
    for (const r of adminManual) {
      console.log(`\n📧 ${r.email}`);
      console.log(`   Nome: ${r.nome}`);
      console.log(`   Plano: ${r.plano.toUpperCase()} (${r.ciclo})`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Data ativação: ${r.dataInicio}`);
      console.log(`   Sub ID: ${r.stripeSubscriptionId}`);
    }
  }

  // Cancelados
  if (canceled.length > 0) {
    console.log('\n\n' + '='.repeat(80));
    console.log('❌ CANCELADOS');
    console.log('='.repeat(80));
    
    for (const r of canceled) {
      console.log(`\n📧 ${r.email}`);
      console.log(`   Plano: ${r.plano.toUpperCase()} | Início: ${r.dataInicio}`);
      console.log(`   Total que pagou: R$ ${r.totalPago.toFixed(2)}`);
    }
  }

  // Past Due
  if (pastDue.length > 0) {
    console.log('\n\n' + '='.repeat(80));
    console.log('⚠️  PAGAMENTO ATRASADO');
    console.log('='.repeat(80));
    
    for (const r of pastDue) {
      console.log(`\n📧 ${r.email}`);
      console.log(`   Plano: ${r.plano.toUpperCase()} | Último pagamento: ${r.ultimoPagamento}`);
    }
  }

  // Estatísticas por plano
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 DISTRIBUIÇÃO POR PLANO (Ativos)');
  console.log('='.repeat(80));
  
  const planCounts: Record<string, number> = {};
  const planRevenue: Record<string, number> = {};
  
  stripePaid.forEach(r => {
    planCounts[r.plano] = (planCounts[r.plano] || 0) + 1;
    planRevenue[r.plano] = (planRevenue[r.plano] || 0) + r.totalPago;
  });

  Object.entries(planCounts).forEach(([plan, count]) => {
    const revenue = planRevenue[plan] || 0;
    console.log(`${plan.toUpperCase().padEnd(12)}: ${count} usuários | R$ ${revenue.toFixed(2)} total`);
  });

  console.log('\n✅ Auditoria profunda concluída!');
}

deepPaymentAudit().catch(console.error);
