/**
 * Script de diagnóstico: Verifica assinaturas duplicadas e pagamentos de um usuário
 *
 * Uso: npx tsx scripts/debug-user-billing.ts amandamorais547@gmail.com
 */
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env.local (Next.js usa esse arquivo, não .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

async function asaasGet(path: string) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    headers: { 'access_token': ASAAS_API_KEY! },
  });
  if (!res.ok) throw new Error(`Asaas ${path}: ${res.status}`);
  return res.json();
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: npx tsx scripts/debug-user-billing.ts <email>');
    process.exit(1);
  }

  console.log(`\n=== Diagnostico de Billing: ${email} ===\n`);

  // 1. Buscar usuario
  const { data: user } = await supabase
    .from('users')
    .select('id, email, clerk_id, plan, is_paid, subscription_status, asaas_customer_id, asaas_subscription_id, subscription_expires_at, grace_period_until, is_blocked')
    .eq('email', email)
    .single();

  if (!user) {
    console.error('Usuario nao encontrado!');
    process.exit(1);
  }

  console.log('--- USUARIO ---');
  console.log(JSON.stringify(user, null, 2));

  // 2. Buscar customers (local)
  const { data: customers } = await supabase
    .from('customers')
    .select('id, user_id, asaas_customer_id, email')
    .eq('user_id', user.id);

  const { data: asaasCustomers } = await supabase
    .from('asaas_customers')
    .select('id, user_id, asaas_customer_id, email')
    .eq('user_id', user.id);

  console.log('\n--- CUSTOMERS (local) ---');
  console.log('customers:', JSON.stringify(customers, null, 2));
  console.log('asaas_customers:', JSON.stringify(asaasCustomers, null, 2));

  // 3. Buscar pagamentos (local)
  const { data: payments } = await supabase
    .from('payments')
    .select('id, asaas_payment_id, asaas_subscription_id, amount, status, payment_method, provider, is_test, plan_type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n--- PAGAMENTOS (local) ---');
  payments?.forEach(p => {
    console.log(`  ${p.created_at} | ${p.asaas_payment_id} | R$${p.amount} | ${p.status} | ${p.payment_method} | sub: ${p.asaas_subscription_id}`);
  });

  // 4. Buscar subscriptions (local)
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, asaas_subscription_id, asaas_customer_id, status, current_period_start, current_period_end, metadata')
    .or(`asaas_customer_id.eq.${user.asaas_customer_id},customer_id.in.(${customers?.map(c => c.id).join(',') || 'null'})`);

  console.log('\n--- ASSINATURAS (local) ---');
  subscriptions?.forEach(s => {
    console.log(`  ${s.asaas_subscription_id} | status: ${s.status} | periodo: ${s.current_period_start} - ${s.current_period_end} | meta: ${JSON.stringify(s.metadata)}`);
  });

  // 5. Buscar webhook events recentes
  const { data: webhookEvents } = await supabase
    .from('webhook_events')
    .select('event_id, event_type, status, created_at, error_message')
    .like('event_id', `%${user.asaas_customer_id || 'NONE'}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  // Tambem buscar por payment IDs
  const paymentIds = payments?.map(p => p.asaas_payment_id).filter(Boolean) || [];
  const { data: webhookByPayment } = await supabase
    .from('webhook_events')
    .select('event_id, event_type, status, created_at')
    .in('event_id', paymentIds.map(id => `asaas_PAYMENT_RECEIVED_${id}`))
    .order('created_at', { ascending: false });

  console.log('\n--- WEBHOOK EVENTS ---');
  webhookEvents?.forEach(w => {
    console.log(`  ${w.created_at} | ${w.event_type} | ${w.status} | ${w.event_id}`);
  });
  webhookByPayment?.forEach(w => {
    console.log(`  ${w.created_at} | ${w.event_type} | ${w.status} | ${w.event_id}`);
  });

  // 6. ASAAS API: Buscar assinaturas ativas do customer
  if (user.asaas_customer_id && ASAAS_API_KEY) {
    console.log('\n--- ASAAS API: ASSINATURAS DO CUSTOMER ---');
    try {
      const subs = await asaasGet(`/subscriptions?customer=${user.asaas_customer_id}&limit=20`);
      console.log(`Total: ${subs.totalCount} assinaturas`);
      subs.data?.forEach((s: any) => {
        console.log(`  ${s.id} | status: ${s.status} | valor: R$${s.value} | ciclo: ${s.cycle} | tipo: ${s.billingType} | prox: ${s.nextDueDate} | desc: ${s.description}`);
      });

      // Verificar DUPLICADAS ATIVAS
      const activeSubs = subs.data?.filter((s: any) => s.status === 'ACTIVE') || [];
      if (activeSubs.length > 1) {
        console.log(`\n  *** PROBLEMA ENCONTRADO: ${activeSubs.length} ASSINATURAS ATIVAS! ***`);
        console.log('  Isso causa cobranca duplicada!');
        console.log('  IDs para cancelar (manter apenas a mais recente):');
        activeSubs.slice(0, -1).forEach((s: any) => {
          console.log(`    -> Cancelar: ${s.id} (criada em ${s.dateCreated})`);
        });
      }
    } catch (e: any) {
      console.error('  Erro ao consultar Asaas:', e.message);
    }

    // 7. ASAAS API: Pagamentos recentes do customer
    console.log('\n--- ASAAS API: PAGAMENTOS DO CUSTOMER ---');
    try {
      const payments = await asaasGet(`/payments?customer=${user.asaas_customer_id}&limit=10&order=desc`);
      payments.data?.forEach((p: any) => {
        console.log(`  ${p.id} | ${p.status} | R$${p.value} | tipo: ${p.billingType} | venc: ${p.dueDate} | pago: ${p.paymentDate || 'N/A'} | sub: ${p.subscription || 'avulso'}`);
      });
    } catch (e: any) {
      console.error('  Erro:', e.message);
    }
  } else {
    console.log('\n[!] ASAAS_API_KEY nao configurada - pulando consulta API');
  }

  console.log('\n=== Fim do diagnostico ===\n');
}

main().catch(console.error);
