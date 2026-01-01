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

// Data de início da cobrança: 10/01/2026
const BILLING_START_DATE = new Date('2026-01-10T00:00:00-03:00');

// Mapeamento de planos para price IDs
const PLAN_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  studio: process.env.STRIPE_PRICE_STUDIO_MONTHLY || '',
};

// Usuários cortesia que precisam migrar
// EXCLUI admins: erickrussomat@gmail.com, yurilojavirtual@gmail.com
const COURTESY_USERS = [
  { email: 'alexandro61266@gmail.com', plan: 'starter' },
  { email: 'alissonbarreto.ads@gmail.com', plan: 'starter' },
  { email: 'faguinhotattoo9@hotmail.com', plan: 'pro' },
  { email: 'gabrielfx.fx528@gmail.com', plan: 'pro' },
  { email: 'jeanlagoa@gmail.com', plan: 'starter' },
  { email: 'maikydemelo999@gmail.com', plan: 'starter' },
  { email: 'marketingadsyuri@gmail.com', plan: 'pro' },
  { email: 'russojoias@gmail.com', plan: 'pro' },
  { email: 'wanderpatriota55@gmail.com', plan: 'starter' },
  // Removidos admins: erickrussomat, yurilojavirtual, coutthomas7
];

async function migrateCourtesyUsers() {
  console.log('🚀 MIGRAÇÃO DE USUÁRIOS CORTESIA PARA STRIPE');
  console.log('='.repeat(70));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📅 Primeira cobrança: ${BILLING_START_DATE.toLocaleDateString('pt-BR')}`);
  console.log(`⚡ ${COURTESY_USERS.length} usuários para migrar\n`);

  // Confirmar antes de prosseguir
  console.log('⚠️  ATENÇÃO: Este script vai criar subscriptions reais no Stripe!');
  console.log('📋 Usuários que serão migrados:\n');
  
  COURTESY_USERS.forEach((u, i) => {
    const priceId = PLAN_PRICES[u.plan];
    console.log(`   ${i + 1}. ${u.email.padEnd(40)} | ${u.plan.padEnd(8)} | ${priceId ? '✅' : '❌ SEM PRICE'}`);
  });

  console.log('\n' + '-'.repeat(70));
  console.log('🔴 Para executar a migração, rode novamente com: --execute');
  console.log('   npx tsx scripts/migrate-courtesy-to-stripe.ts --execute');
  console.log('-'.repeat(70));

  // Se não tiver --execute, não faz nada
  if (!process.argv.includes('--execute')) {
    console.log('\n⏸️  Modo DRY RUN - Nenhuma alteração foi feita.');
    return;
  }

  console.log('\n\n🚀 EXECUTANDO MIGRAÇÃO...\n');

  let success = 0;
  let errors = 0;

  for (const courtesyUser of COURTESY_USERS) {
    console.log(`\n📧 Processando: ${courtesyUser.email}`);

    try {
      // 1. Buscar usuário no banco
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, name, clerk_id')
        .eq('email', courtesyUser.email.toLowerCase())
        .single();

      if (userError || !user) {
        console.log(`   ❌ Usuário não encontrado no banco`);
        errors++;
        continue;
      }

      // 2. Verificar se já existe customer no Stripe
      const existingCustomers = await stripe.customers.list({
        email: courtesyUser.email,
        limit: 1,
      });

      let stripeCustomer: Stripe.Customer;

      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
        console.log(`   📋 Customer existente: ${stripeCustomer.id}`);
      } else {
        // Criar customer
        stripeCustomer = await stripe.customers.create({
          email: courtesyUser.email,
          name: user.name || undefined,
          metadata: {
            clerk_id: user.clerk_id,
            user_id: user.id,
            migration: 'courtesy_2026',
          },
        });
        console.log(`   ✨ Customer criado: ${stripeCustomer.id}`);
      }

      // 3. Obter price ID
      const priceId = PLAN_PRICES[courtesyUser.plan];
      if (!priceId) {
        console.log(`   ❌ Price ID não encontrado para plano: ${courtesyUser.plan}`);
        errors++;
        continue;
      }

      // 4. Criar subscription com trial até 10/01/2026
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{ price: priceId }],
        trial_end: Math.floor(BILLING_START_DATE.getTime() / 1000),
        metadata: {
          clerk_id: user.clerk_id,
          user_id: user.id,
          plan: courtesyUser.plan,
          migration: 'courtesy_to_paid',
          migrated_at: new Date().toISOString(),
        },
        payment_behavior: 'default_incomplete', // Não força pagamento agora
      });

      console.log(`   ✅ Subscription criada: ${subscription.id}`);
      console.log(`   📅 Trial até: ${BILLING_START_DATE.toLocaleDateString('pt-BR')}`);
      console.log(`   📋 Status: ${subscription.status}`);

      // 5. Atualizar banco com subscription_id
      await supabase
        .from('users')
        .update({
          subscription_id: subscription.id,
          subscription_status: 'trialing',
          is_paid: true,
          plan: courtesyUser.plan,
          tools_unlocked: courtesyUser.plan === 'pro' || courtesyUser.plan === 'studio',
        })
        .eq('id', user.id);

      // 6. Salvar customer no banco
      await supabase.from('customers').upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomer.id,
        email: courtesyUser.email,
      }, { onConflict: 'user_id' });

      success++;

    } catch (error: any) {
      console.log(`   ❌ Erro: ${error.message}`);
      errors++;
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RESULTADO DA MIGRAÇÃO');
  console.log('='.repeat(70));
  console.log(`✅ Sucesso: ${success}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`📅 Primeira cobrança: ${BILLING_START_DATE.toLocaleDateString('pt-BR')}`);
  console.log('\n✅ Migração concluída!');
}

migrateCourtesyUsers().catch(console.error);
