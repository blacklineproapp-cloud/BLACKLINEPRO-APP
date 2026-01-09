import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUser() {
  const email = 'joaognr2010@hotmail.com';
  const userId = '83c7b053-64e7-4fb1-aa10-99de45a8ef4f';
  
  console.log('\n🔍 VERIFICANDO USUÁRIO ESPECÍFICO');
  console.log('='.repeat(80));
  console.log(`📧 Email: ${email}`);
  console.log(`🆔 User ID: ${userId}\n`);

  // Verificar usuário
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('👤 DADOS DO USUÁRIO:');
  console.log(`   Email: ${user?.email}`);
  console.log(`   Nome: ${user?.name}`);
  console.log(`   Plano: ${user?.plan}`);
  console.log(`   is_paid: ${user?.is_paid}`);
  console.log(`   subscription_status: ${user?.subscription_status}`);
  console.log(`   subscription_id: ${user?.subscription_id}`);
  console.log(`   tools_unlocked: ${user?.tools_unlocked}`);
  console.log(`   admin_courtesy: ${user?.admin_courtesy}`);

  // Verificar pagamentos
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId);

  console.log(`\n💰 PAGAMENTOS REGISTRADOS: ${payments?.length || 0}`);
  if (payments && payments.length > 0) {
    payments.forEach(p => {
      console.log(`   - R$ ${p.amount} - ${p.status} - ${p.payment_method} - ${new Date(p.created_at).toLocaleString('pt-BR')}`);
    });
  }

  // Verificar customer
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.log(`\n🏢 CUSTOMER:`);
  console.log(`   Stripe Customer ID: ${customer?.stripe_customer_id}`);
  console.log(`   Email: ${customer?.email}`);

  console.log('\n' + '='.repeat(80));
  console.log('📊 DIAGNÓSTICO:');
  
  if (!user?.is_paid) {
    console.log('❌ Usuário NÃO está marcado como pago');
  }
  
  if (!payments || payments.length === 0) {
    console.log('❌ Nenhum pagamento registrado no banco');
  }
  
  if (!user?.subscription_id) {
    console.log('❌ Usuário sem subscription_id');
  }

  console.log('\n✅ Verificação concluída!\n');
}

checkUser().catch(console.error);
