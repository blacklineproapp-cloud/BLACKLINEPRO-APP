import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

interface DiagnosticResult {
  section: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  data?: any;
}

const results: DiagnosticResult[] = [];

async function diagnosePaymentIssue() {
  console.log('\n🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE PAGAMENTOS');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // ============================================================================
  // 1. VERIFICAR WEBHOOKS RECEBIDOS
  // ============================================================================
  console.log('📡 [1/7] Verificando webhooks recebidos...');
  
  const { data: recentWebhooks, error: webhookError } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('source', 'stripe')
    .order('created_at', { ascending: false })
    .limit(50);

  if (webhookError) {
    results.push({
      section: 'Webhooks',
      status: 'ERROR',
      message: `Erro ao buscar webhooks: ${webhookError.message}`
    });
  } else {
    const checkoutCompleted = recentWebhooks?.filter(w => w.event_type === 'checkout.session.completed') || [];
    const asyncPaymentSucceeded = recentWebhooks?.filter(w => w.event_type === 'checkout.session.async_payment_succeeded') || [];
    const failed = recentWebhooks?.filter(w => w.status === 'failed') || [];
    
    results.push({
      section: 'Webhooks Recebidos',
      status: failed.length > 0 ? 'WARNING' : 'OK',
      message: `Total: ${recentWebhooks?.length || 0} | checkout.session.completed: ${checkoutCompleted.length} | async_payment_succeeded: ${asyncPaymentSucceeded.length} | Falhas: ${failed.length}`,
      data: {
        total: recentWebhooks?.length || 0,
        checkoutCompleted: checkoutCompleted.length,
        asyncPaymentSucceeded: asyncPaymentSucceeded.length,
        failed: failed.length,
        failedEvents: failed.map(f => ({
          id: f.event_id,
          type: f.event_type,
          error: f.error_message,
          retries: f.retry_count
        }))
      }
    });
  }

  // ============================================================================
  // 2. VERIFICAR PAGAMENTOS NO BANCO vs STRIPE
  // ============================================================================
  console.log('💳 [2/7] Comparando pagamentos no banco vs Stripe...');
  
  const { data: dbPayments } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  // Buscar charges do Stripe
  const stripeCharges = await stripe.charges.list({ limit: 100 });
  const successfulCharges = stripeCharges.data.filter(c => c.status === 'succeeded' && c.paid);

  const dbPaymentIds = new Set(dbPayments?.map(p => p.stripe_payment_id) || []);
  const stripePaymentIds = new Set(successfulCharges.map(c => c.id));

  const missingInDb = successfulCharges.filter(c => !dbPaymentIds.has(c.id));
  const missingInStripe = dbPayments?.filter(p => p.stripe_payment_id && !stripePaymentIds.has(p.stripe_payment_id)) || [];

  results.push({
    section: 'Sincronização Pagamentos',
    status: missingInDb.length > 0 ? 'ERROR' : 'OK',
    message: `DB: ${dbPayments?.length || 0} | Stripe: ${successfulCharges.length} | Faltando no DB: ${missingInDb.length} | Faltando no Stripe: ${missingInStripe.length}`,
    data: {
      missingInDb: missingInDb.map(c => ({
        id: c.id,
        amount: c.amount / 100,
        created: new Date(c.created * 1000).toLocaleString('pt-BR'),
        customer: c.customer,
        paymentMethod: c.payment_method_details?.type
      })),
      missingInStripe: missingInStripe.map(p => ({
        id: p.stripe_payment_id,
        amount: p.amount,
        created: p.created_at
      }))
    }
  });

  // ============================================================================
  // 3. VERIFICAR BOLETOS PENDENTES
  // ============================================================================
  console.log('📄 [3/7] Verificando boletos pendentes...');
  
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .eq('payment_method', 'boleto');

  results.push({
    section: 'Boletos Pendentes',
    status: pendingPayments && pendingPayments.length > 0 ? 'WARNING' : 'OK',
    message: `${pendingPayments?.length || 0} boletos aguardando compensação`,
    data: pendingPayments?.map(p => ({
      user_id: p.user_id,
      amount: p.amount,
      created: p.created_at,
      description: p.description
    }))
  });

  // ============================================================================
  // 4. VERIFICAR USUÁRIOS PAGOS SEM SUBSCRIPTION_ID
  // ============================================================================
  console.log('👥 [4/7] Verificando usuários pagos sem subscription_id...');
  
  const { data: paidUsersNoSub } = await supabase
    .from('users')
    .select('id, email, plan, is_paid, subscription_id, subscription_status, admin_courtesy')
    .eq('is_paid', true)
    .is('subscription_id', null)
    .eq('admin_courtesy', false);

  results.push({
    section: 'Usuários Pagos sem Subscription',
    status: paidUsersNoSub && paidUsersNoSub.length > 0 ? 'ERROR' : 'OK',
    message: `${paidUsersNoSub?.length || 0} usuários marcados como pagos mas sem subscription_id (e não são cortesia)`,
    data: paidUsersNoSub?.map(u => ({
      email: u.email,
      plan: u.plan,
      subscription_status: u.subscription_status
    }))
  });

  // ============================================================================
  // 5. VERIFICAR CUSTOMERS SEM STRIPE_CUSTOMER_ID
  // ============================================================================
  console.log('🏢 [5/7] Verificando customers sem stripe_customer_id...');
  
  const { data: customersNoStripeId } = await supabase
    .from('customers')
    .select('id, user_id, email')
    .is('stripe_customer_id', null);

  results.push({
    section: 'Customers sem Stripe ID',
    status: customersNoStripeId && customersNoStripeId.length > 0 ? 'WARNING' : 'OK',
    message: `${customersNoStripeId?.length || 0} customers sem stripe_customer_id`,
    data: customersNoStripeId
  });

  // ============================================================================
  // 6. VERIFICAR SUBSCRIPTIONS ATIVAS NO STRIPE vs BANCO
  // ============================================================================
  console.log('📋 [6/7] Comparando subscriptions Stripe vs Banco...');
  
  const stripeSubscriptions = await stripe.subscriptions.list({ 
    limit: 100,
    status: 'active'
  });

  const { data: dbSubscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active');

  const dbSubIds = new Set(dbSubscriptions?.map(s => s.stripe_subscription_id) || []);
  const stripeSubIds = new Set(stripeSubscriptions.data.map(s => s.id));

  const subsInStripeMissingInDb = stripeSubscriptions.data.filter(s => !dbSubIds.has(s.id));
  const subsInDbMissingInStripe = dbSubscriptions?.filter(s => !stripeSubIds.has(s.stripe_subscription_id)) || [];

  results.push({
    section: 'Sincronização Subscriptions',
    status: subsInStripeMissingInDb.length > 0 ? 'ERROR' : 'OK',
    message: `Stripe Ativas: ${stripeSubscriptions.data.length} | DB Ativas: ${dbSubscriptions?.length || 0} | Faltando no DB: ${subsInStripeMissingInDb.length}`,
    data: {
      missingInDb: subsInStripeMissingInDb.map(s => ({
        id: s.id,
        customer: s.customer,
        status: s.status,
        created: new Date(s.created * 1000).toLocaleString('pt-BR')
      })),
      missingInStripe: subsInDbMissingInStripe.map(s => ({
        id: s.stripe_subscription_id,
        status: s.status
      }))
    }
  });

  // ============================================================================
  // 7. VERIFICAR USUÁRIOS COM PAGAMENTO MAS PLANO NÃO ATUALIZADO
  // ============================================================================
  console.log('⚠️  [7/7] Verificando usuários com pagamento mas plano não atualizado...');
  
  // Buscar pagamentos bem-sucedidos
  const { data: successfulPayments } = await supabase
    .from('payments')
    .select('user_id, plan_type, created_at')
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(50);

  const usersWithPayments = new Set(successfulPayments?.map(p => p.user_id) || []);
  
  // Verificar se esses usuários têm is_paid = true
  const { data: usersStatus } = await supabase
    .from('users')
    .select('id, email, plan, is_paid, subscription_status')
    .in('id', Array.from(usersWithPayments));

  const paidButNotMarked = usersStatus?.filter(u => !u.is_paid) || [];

  results.push({
    section: 'Usuários com Pagamento mas Não Marcados',
    status: paidButNotMarked.length > 0 ? 'ERROR' : 'OK',
    message: `${paidButNotMarked.length} usuários com pagamento succeeded mas is_paid = false`,
    data: paidButNotMarked.map(u => ({
      email: u.email,
      plan: u.plan,
      subscription_status: u.subscription_status
    }))
  });

  // ============================================================================
  // EXIBIR RESULTADOS
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESULTADOS DO DIAGNÓSTICO');
  console.log('='.repeat(80) + '\n');

  let hasErrors = false;
  let hasWarnings = false;

  results.forEach((result, index) => {
    const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} [${index + 1}] ${result.section}`);
    console.log(`    ${result.message}`);
    
    if (result.status === 'ERROR') {
      hasErrors = true;
      if (result.data && Object.keys(result.data).length > 0) {
        console.log(`    Detalhes:`, JSON.stringify(result.data, null, 2));
      }
    } else if (result.status === 'WARNING') {
      hasWarnings = true;
      if (result.data && Object.keys(result.data).length > 0) {
        console.log(`    Detalhes:`, JSON.stringify(result.data, null, 2));
      }
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('🎯 RESUMO FINAL');
  console.log('='.repeat(80));
  
  if (hasErrors) {
    console.log('❌ PROBLEMAS CRÍTICOS ENCONTRADOS!');
    console.log('   Ação necessária: Corrigir os erros acima antes de continuar.');
  } else if (hasWarnings) {
    console.log('⚠️  Avisos encontrados, mas sistema operacional.');
  } else {
    console.log('✅ Todos os sistemas funcionando corretamente!');
  }
  
  console.log('\n✅ Diagnóstico concluído!\n');
}

diagnosePaymentIssue().catch(console.error);
