import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function identifyCourtesyUsers() {
  console.log('🔍 IDENTIFICANDO USUÁRIOS CORTESIA x PAGANTES STRIPE');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar TODOS os usuários is_paid = true no banco
  const { data: paidUsers, error } = await supabase
    .from('users')
    .select('id, email, name, plan, is_paid, subscription_status, subscription_id, created_at')
    .eq('is_paid', true)
    .order('email');

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    return;
  }

  console.log(`📊 Total de usuários com is_paid=true no banco: ${paidUsers.length}\n`);

  // 2. Buscar pagamentos do Stripe (emails que realmente pagaram)
  let charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });
    
    charges = [...charges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const successfulCharges = charges.filter(c => c.status === 'succeeded' && c.paid);
  
  // Coletar emails que pagaram via Stripe
  const paidEmails = new Set<string>();
  
  for (const charge of successfulCharges) {
    let email = charge.billing_details?.email || charge.receipt_email || '';
    
    if (!email && charge.customer) {
      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer.id;
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.deleted && customer.email) {
          email = customer.email;
        }
      } catch (e) {}
    }
    
    if (email) {
      paidEmails.add(email.toLowerCase().trim());
    }
  }

  console.log(`💳 Emails que pagaram via Stripe: ${paidEmails.size}\n`);

  // 3. Separar usuários
  const stripeUsers: typeof paidUsers = [];
  const courtesyUsers: typeof paidUsers = [];

  for (const user of paidUsers) {
    const emailLower = user.email?.toLowerCase().trim() || '';
    if (paidEmails.has(emailLower)) {
      stripeUsers.push(user);
    } else {
      courtesyUsers.push(user);
    }
  }

  // 4. Exibir resultados
  console.log('='.repeat(80));
  console.log('💳 USUÁRIOS QUE PAGARAM VIA STRIPE (' + stripeUsers.length + ')');
  console.log('='.repeat(80));
  
  for (const u of stripeUsers) {
    console.log(`✅ ${u.email?.padEnd(40)} | ${u.plan?.padEnd(8)} | ${u.subscription_status}`);
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('🎁 USUÁRIOS CORTESIA - MIGRAÇÃO APP ANTIGO (' + courtesyUsers.length + ')');
  console.log('='.repeat(80));
  console.log('⚠️  Estes usuários precisam iniciar cobrança recorrente em 10/01/2026\n');
  
  console.log(`${'Email'.padEnd(45)} | ${'Plano'.padEnd(8)} | Status`);
  console.log('-'.repeat(80));
  
  for (const u of courtesyUsers) {
    console.log(`🎁 ${u.email?.substring(0,43).padEnd(43)} | ${(u.plan || 'N/A').padEnd(8)} | ${u.subscription_status || 'N/A'}`);
  }

  // 5. Resumo
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO');
  console.log('='.repeat(80));
  console.log(`Total is_paid=true:     ${paidUsers.length}`);
  console.log(`Pagantes Stripe:        ${stripeUsers.length}`);
  console.log(`Cortesia (migração):    ${courtesyUsers.length}`);
  console.log(`\n⚡ Ação necessária: Criar subscription para ${courtesyUsers.length} usuários`);
  console.log(`📅 Data de início cobrança: 10/01/2026`);

  // 6. Exportar lista de cortesia para ação
  console.log('\n\n' + '='.repeat(80));
  console.log('📝 EMAILS PARA MIGRAÇÃO (copie e cole):');
  console.log('='.repeat(80));
  
  courtesyUsers.forEach(u => {
    console.log(u.email);
  });

  console.log('\n✅ Análise concluída!');
}

identifyCourtesyUsers().catch(console.error);
