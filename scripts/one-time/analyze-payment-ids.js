/**
 * Análise de IDs de Pagamento no Banco de Dados
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyze() {
  console.log('📊 ANÁLISE DE IDS DE PAGAMENTO NO BANCO DE DADOS\n');

  const { data, error } = await supabase
    .from('payments')
    .select('id, stripe_payment_id, stripe_payment_intent_id, amount, status, created_at');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Total de pagamentos: ${data.length}\n`);

  // Estatísticas de IDs
  const stats = {
    total: data.length,
    paymentIdStartsWithPi: 0,
    paymentIdStartsWithCh: 0,
    paymentIdStartsWithPy: 0,
    paymentIdOther: 0,
    hasPaymentIntentId: 0,
    noPaymentIntentId: 0,
  };

  const paymentIdFormats = {};

  data.forEach((p) => {
    const payId = p.stripe_payment_id || '';
    const prefix = payId.substring(0, 3);
    
    paymentIdFormats[prefix] = (paymentIdFormats[prefix] || 0) + 1;

    if (payId.startsWith('pi_')) stats.paymentIdStartsWithPi++;
    else if (payId.startsWith('ch_')) stats.paymentIdStartsWithCh++;
    else if (payId.startsWith('py_')) stats.paymentIdStartsWithPy++;
    else stats.paymentIdOther++;

    if (p.stripe_payment_intent_id) stats.hasPaymentIntentId++;
    else stats.noPaymentIntentId++;
  });

  console.log('📈 ESTATÍSTICAS DE stripe_payment_id:');
  console.log(`   Começa com pi_: ${stats.paymentIdStartsWithPi}`);
  console.log(`   Começa com ch_: ${stats.paymentIdStartsWithCh}`);
  console.log(`   Começa com py_: ${stats.paymentIdStartsWithPy}`);
  console.log(`   Outros: ${stats.paymentIdOther}`);

  console.log('\n📈 ESTATÍSTICAS DE stripe_payment_intent_id:');
  console.log(`   Com valor: ${stats.hasPaymentIntentId}`);
  console.log(`   NULL: ${stats.noPaymentIntentId}`);

  console.log('\n📋 FORMATOS DE ID ENCONTRADOS:');
  Object.entries(paymentIdFormats).forEach(([prefix, count]) => {
    console.log(`   ${prefix}*: ${count}`);
  });

  // Listar últimos 10 pagamentos para exemplo
  console.log('\n📝 ÚLTIMOS 10 PAGAMENTOS:');
  const recent = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  recent.forEach((p) => {
    console.log(`   ${p.stripe_payment_id} | PI: ${p.stripe_payment_intent_id || 'NULL'} | R$ ${p.amount} | ${p.status}`);
  });
}

analyze();
