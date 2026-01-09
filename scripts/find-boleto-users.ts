import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findBoletoUsers() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA - USUÁRIOS DE BOLETO');
  console.log('='.repeat(80));

  // Buscar boletos
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

  const boletoCharges = charges.filter(c => 
    c.status === 'succeeded' && 
    c.paid && 
    c.payment_method_details?.boleto
  );

  console.log(`\n✅ ${boletoCharges.length} boletos pagos encontrados\n`);

  for (let i = 0; i < boletoCharges.length; i++) {
    const charge = boletoCharges[i];
    const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
    
    let email = charge.billing_details?.email || charge.receipt_email || '';
    let nome = charge.billing_details?.name || '';

    if (!email && charge.customer) {
      try {
        const customer = await stripe.customers.retrieve(customerId!) as Stripe.Customer;
        if (!customer.deleted) {
          email = customer.email || '';
          nome = nome || customer.name || '';
        }
      } catch (e) {}
    }

    console.log(`\n${'-'.repeat(80)}`);
    console.log(`📋 BOLETO #${i + 1} - ${email}`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`💰 Valor: R$ ${(charge.amount / 100).toFixed(2)}`);
    console.log(`📅 Data: ${new Date(charge.created * 1000).toLocaleString('pt-BR')}`);
    console.log(`🆔 Customer ID: ${customerId}`);
    console.log(`👤 Nome: ${nome}`);

    // 1. Buscar por email EXATO
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userByEmail) {
      console.log(`\n✅ ENCONTRADO POR EMAIL:`);
      console.log(`   ID: ${userByEmail.id}`);
      console.log(`   Nome: ${userByEmail.name}`);
      console.log(`   Plano: ${userByEmail.plan}`);
      console.log(`   is_paid: ${userByEmail.is_paid}`);
      console.log(`   stripe_customer_id: ${userByEmail.stripe_customer_id || 'NULL'}`);
      continue;
    }

    // 2. Buscar por customer_id
    const { data: userByCustomer } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userByCustomer) {
      console.log(`\n✅ ENCONTRADO POR CUSTOMER_ID:`);
      console.log(`   ID: ${userByCustomer.id}`);
      console.log(`   Email no banco: ${userByCustomer.email}`);
      console.log(`   Email no Stripe: ${email}`);
      console.log(`   ⚠️  EMAILS DIFERENTES!`);
      console.log(`   Nome: ${userByCustomer.name}`);
      console.log(`   Plano: ${userByCustomer.plan}`);
      console.log(`   is_paid: ${userByCustomer.is_paid}`);
      continue;
    }

    // 3. Buscar por email case-insensitive
    const { data: usersCaseInsensitive } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email);

    if (usersCaseInsensitive && usersCaseInsensitive.length > 0) {
      console.log(`\n✅ ENCONTRADO POR EMAIL (case-insensitive):`);
      usersCaseInsensitive.forEach(u => {
        console.log(`   ID: ${u.id}`);
        console.log(`   Email no banco: ${u.email}`);
        console.log(`   Email no Stripe: ${email}`);
        console.log(`   Plano: ${u.plan}`);
        console.log(`   is_paid: ${u.is_paid}`);
      });
      continue;
    }

    // 4. Buscar por nome similar
    const { data: usersByName } = await supabase
      .from('users')
      .select('*')
      .ilike('name', `%${nome.split(' ')[0]}%`);

    if (usersByName && usersByName.length > 0) {
      console.log(`\n🔍 POSSÍVEIS MATCHES POR NOME:`);
      usersByName.forEach(u => {
        console.log(`   - ${u.email} | ${u.name} | ${u.plan} | is_paid: ${u.is_paid}`);
      });
      continue;
    }

    // 5. Nenhum match
    console.log(`\n❌ USUÁRIO NÃO ENCONTRADO NO BANCO!`);
    console.log(`\n💡 POSSÍVEIS CAUSAS:`);
    console.log(`   1. Usuário pagou mas NUNCA criou conta no app`);
    console.log(`   2. Usuário criou conta com email diferente`);
    console.log(`   3. Usuário foi deletado do banco`);
    console.log(`\n🔧 SOLUÇÃO:`);
    console.log(`   - Verificar no Stripe se há metadata com user_id`);
    console.log(`   - Pedir para o usuário criar conta com email: ${email}`);
    console.log(`   - Ou criar conta manualmente e vincular ao customer_id`);
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('✅ Investigação concluída!\n');
}

findBoletoUsers().catch(console.error);
