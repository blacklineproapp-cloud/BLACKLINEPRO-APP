#!/usr/bin/env npx tsx
/**
 * Debug: Verificar Pagamentos Diretamente
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function debugPayments() {
  console.log('🔍 DEBUG: Verificando pagamentos no banco\n');
  console.log('='.repeat(60));

  const { supabaseAdmin } = await import('../lib/supabase');

  // 1. Contar TODOS os pagamentos
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('payments')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Total de pagamentos na tabela:', totalCount);

  // 2. Buscar últimos 5 pagamentos (qualquer tipo)
  const { data: allPayments, error: allError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (allError) {
    console.error('❌ Erro:', allError);
  } else if (allPayments && allPayments.length > 0) {
    console.log('\n💳 Últimos 5 pagamentos (todos):\n');
    for (const p of allPayments) {
      console.log(`ID: ${p.id}`);
      console.log(`  asaas_payment_id: ${p.asaas_payment_id || 'NULL'}`);
      console.log(`  stripe_payment_id: ${p.stripe_payment_id || 'NULL'}`);
      console.log(`  amount: R$ ${p.amount}`);
      console.log(`  status: ${p.status}`);
      console.log(`  created_at: ${p.created_at}`);
      console.log('');
    }
  }

  // 3. Buscar especificamente por asaas_payment_id
  const { data: asaasPayments, error: asaasError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .not('asaas_payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n💰 Pagamentos com asaas_payment_id:');
  if (asaasError) {
    console.error('❌ Erro:', asaasError);
  } else if (asaasPayments && asaasPayments.length > 0) {
    console.log(`✅ Encontrados: ${asaasPayments.length}\n`);
    for (const p of asaasPayments) {
      console.log(`${p.asaas_payment_id} - R$ ${p.amount}`);
    }
  } else {
    console.log('❌ Nenhum encontrado');
  }

  // 4. Buscar pelo ID específico que vimos nos logs
  const { data: specificPayment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('asaas_payment_id', 'pay_qwdv4p67f64y30ya')
    .single();

  console.log('\n🔍 Busca específica por pay_qwdv4p67f64y30ya:');
  if (specificPayment) {
    console.log('✅ ENCONTRADO!');
    console.log(JSON.stringify(specificPayment, null, 2));
  } else {
    console.log('❌ NÃO ENCONTRADO');
  }

  console.log('\n' + '='.repeat(60));
}

debugPayments();
