import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function unlockUser() {
  const email = 'df9187990@gmail.com';
  
  console.log('🔓 DESBLOQUEANDO USUÁRIO DE BOLETO');
  console.log('='.repeat(80));
  console.log(`📧 Email: ${email}\n`);

  // 1. Buscar usuário
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.log(`❌ Usuário não encontrado!`);
    console.log(`   Erro:`, userError);
    return;
  }

  console.log(`👤 Usuário encontrado: ${user.name}`);
  console.log(`   Plano: ${user.plan}`);
  console.log(`   is_paid: ${user.is_paid}`);
  console.log(`   tools_unlocked: ${user.tools_unlocked}`);
  console.log(`   subscription_status: ${user.subscription_status}`);

  // 2. Verificar se já está liberado
  if (user.tools_unlocked && user.is_paid) {
    console.log(`\n✅ Usuário já está liberado!`);
    return;
  }

  // 3. Desbloquear
  console.log(`\n🔄 Desbloqueando ferramentas...`);

  const { error: updateError } = await supabase
    .from('users')
    .update({
      tools_unlocked: true,
      is_paid: true,
      usage_this_month: {},
      daily_usage: {},
    })
    .eq('id', user.id);

  if (updateError) {
    console.error(`❌ Erro ao atualizar:`, updateError);
    return;
  }

  // 4. Verificar
  const { data: updatedUser } = await supabase
    .from('users')
    .select('tools_unlocked, is_paid, plan')
    .eq('id', user.id)
    .single();

  console.log(`\n✅ ATUALIZAÇÃO CONCLUÍDA:`);
  console.log(`   tools_unlocked: ${user.tools_unlocked} → ${updatedUser?.tools_unlocked} ✅`);
  console.log(`   is_paid: ${user.is_paid} → ${updatedUser?.is_paid} ✅`);
  console.log(`   Plano: ${updatedUser?.plan}`);

  if (updatedUser?.tools_unlocked && updatedUser?.is_paid) {
    console.log(`\n🎉 USUÁRIO DESBLOQUEADO COM SUCESSO!`);
    console.log(`   ${email} agora pode usar o app normalmente!`);
    console.log(`\n💡 Próximo passo: Pedir para fazer LOGOUT e LOGIN novamente`);
  } else {
    console.log(`\n⚠️  Algo deu errado, verificar manualmente`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Processo concluído!\n');
}

unlockUser().catch(console.error);
