import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLegacyUser() {
  const email = 'pompiliotattoo63@gmail.com';
  
  console.log('\n🔍 VERIFICANDO USUÁRIO LEGACY');
  console.log('='.repeat(80));
  console.log(`📧 Email: ${email}\n`);

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) {
    console.log('❌ Usuário não encontrado\n');
    return;
  }

  console.log('👤 DADOS DO USUÁRIO:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Nome: ${user.name}`);
  console.log(`   Plano: ${user.plan}`);
  console.log(`   is_paid: ${user.is_paid}`);
  console.log(`   subscription_status: ${user.subscription_status}`);
  console.log(`   subscription_id: ${user.subscription_id}`);
  console.log(`   tools_unlocked: ${user.tools_unlocked}`);
  console.log(`   admin_courtesy: ${user.admin_courtesy}`);
  console.log(`   grace_period_until: ${user.grace_period_until}`);

  // Verificar pagamentos
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id);

  console.log(`\n💰 PAGAMENTOS: ${payments?.length || 0}`);
  if (payments && payments.length > 0) {
    payments.forEach(p => {
      console.log(`   - R$ ${p.amount} - ${p.status} - ${p.payment_method} - ${new Date(p.created_at).toLocaleString('pt-BR')}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 DIAGNÓSTICO:');
  
  if (user.plan === 'ink' && user.is_paid === false) {
    console.log('✅ CORRETO: Plano Ink com is_paid = false (aguardando pagamento)');
  } else if (user.plan === 'ink' && user.is_paid === true) {
    console.log('❌ ERRO: Plano Ink com is_paid = true (não deveria estar liberado!)');
  }

  if (!payments || payments.length === 0) {
    console.log('✅ CORRETO: Nenhum pagamento registrado (boleto falhou)');
  }

  console.log('\n✅ Verificação concluída!\n');
}

checkLegacyUser().catch(console.error);
