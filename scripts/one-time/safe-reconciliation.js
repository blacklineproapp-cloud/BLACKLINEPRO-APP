/**
 * Script SEGURO de Reconciliação - Verifica Charge + PaymentIntent
 * 
 * CORRIGIDO: Agora verifica se o pagamento existe tanto por pi_ quanto por ch_
 * para evitar duplicatas
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe').default;
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10'
});

async function safeReconciliation() {
  console.log('🔍 RECONCILIAÇÃO SEGURA STRIPE <-> DATABASE');
  console.log('='.repeat(80));

  // 1. Buscar todos os IDs do banco
  console.log('📥 Buscando todos os IDs do banco de dados...');
  const { data: dbPayments, error } = await supabase
    .from('payments')
    .select('stripe_payment_id, stripe_payment_intent_id, amount');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  // Criar sets de todos os IDs existentes
  const existingIds = new Set();
  dbPayments.forEach(p => {
    if (p.stripe_payment_id) existingIds.add(p.stripe_payment_id);
    if (p.stripe_payment_intent_id) existingIds.add(p.stripe_payment_intent_id);
  });

  console.log(`✅ DB: ${dbPayments.length} pagamentos, ${existingIds.size} IDs únicos`);

  // 2. Buscar PaymentIntents do Stripe
  console.log('📥 Buscando PaymentIntents do Stripe...');
  let paymentIntents = [];
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const response = await stripe.paymentIntents.list({
      limit: 100,
      starting_after: startingAfter,
    });
    paymentIntents = [...paymentIntents, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const succeededPIs = paymentIntents.filter(pi => pi.status === 'succeeded');
  console.log(`✅ Stripe: ${succeededPIs.length} PaymentIntents succeeded`);

  // 3. Para cada PaymentIntent, verificar se existe no DB
  console.log('\n🔍 VERIFICANDO CADA PAGAMENTO...\n');
  
  let reallyMissing = [];
  let alreadyExists = 0;

  for (const pi of succeededPIs) {
    // Verificar se PI existe
    if (existingIds.has(pi.id)) {
      alreadyExists++;
      continue;
    }

    // Buscar Charges associados a este PaymentIntent
    try {
      const charges = await stripe.charges.list({
        payment_intent: pi.id,
        limit: 10
      });

      // Verificar se algum Charge já existe no DB
      let chargeExists = false;
      for (const charge of charges.data) {
        if (existingIds.has(charge.id)) {
          chargeExists = true;
          break;
        }
      }

      if (chargeExists) {
        alreadyExists++;
      } else {
        reallyMissing.push({
          pi: pi,
          charges: charges.data.map(c => c.id)
        });
      }
    } catch (err) {
      // Se não conseguiu buscar charges, marcar como potencialmente faltante
      reallyMissing.push({
        pi: pi,
        charges: []
      });
    }
  }

  console.log(`✅ Já existem no DB (por PI ou Charge): ${alreadyExists}`);
  console.log(`❌ REALMENTE faltando: ${reallyMissing.length}`);

  if (reallyMissing.length === 0) {
    console.log('\n🎉 TODOS OS PAGAMENTOS ESTÃO SINCRONIZADOS!');
    console.log('   Não há nada a fazer.\n');
    return;
  }

  console.log('\n📋 PAGAMENTOS REALMENTE FALTANDO:');
  let totalMissing = 0;
  reallyMissing.forEach(item => {
    const pi = item.pi;
    totalMissing += pi.amount / 100;
    console.log(`   ${pi.id} | R$ ${(pi.amount/100).toFixed(2)} | ${new Date(pi.created * 1000).toLocaleDateString('pt-BR')}`);
    if (item.charges.length > 0) {
      console.log(`      Charges: ${item.charges.join(', ')}`);
    }
  });
  
  console.log(`\n💰 TOTAL REALMENTE FALTANDO: R$ ${totalMissing.toFixed(2)}`);
  
  // Salvar lista para revisão
  console.log('\n📝 Lista salva em: scripts/missing-payments.json');
  require('fs').writeFileSync(
    'scripts/missing-payments.json',
    JSON.stringify(reallyMissing.map(item => ({
      payment_intent_id: item.pi.id,
      amount: item.pi.amount / 100,
      currency: item.pi.currency,
      created: new Date(item.pi.created * 1000).toISOString(),
      charges: item.charges,
      customer: typeof item.pi.customer === 'string' ? item.pi.customer : item.pi.customer?.id,
      metadata: item.pi.metadata
    })), null, 2)
  );
  
  console.log('\n⚠️  REVISE O ARQUIVO missing-payments.json ANTES DE SINCRONIZAR!');
}

safeReconciliation().catch(console.error);
