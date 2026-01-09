import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function unlockBoletoUsers() {
  console.log('🔓 DESBLOQUEANDO USUÁRIOS QUE PAGARAM VIA BOLETO');
  console.log('='.repeat(80));

  const emails = [
    'joaognr2010@hotmail.com',
    'dgtattooartist10@gmail.com'
  ];

  for (const email of emails) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔧 PROCESSANDO: ${email}`);
    console.log('='.repeat(80));

    // 1. Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.log(`❌ Usuário não encontrado!`);
      continue;
    }

    console.log(`\n👤 Usuário encontrado: ${user.name}`);
    console.log(`   Plano: ${user.plan}`);
    console.log(`   is_paid: ${user.is_paid}`);
    console.log(`   tools_unlocked: ${user.tools_unlocked} ❌`);
    console.log(`   subscription_status: ${user.subscription_status}`);

    // 2. Desbloquear ferramentas
    console.log(`\n🔄 Desbloqueando ferramentas...`);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        tools_unlocked: true,
        usage_this_month: {},  // Resetar uso mensal
        daily_usage: {},       // Resetar uso diário
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar:`, updateError);
      continue;
    }

    // 3. Verificar atualização
    const { data: updatedUser } = await supabase
      .from('users')
      .select('tools_unlocked, usage_this_month, daily_usage')
      .eq('id', user.id)
      .single();

    console.log(`\n✅ ATUALIZAÇÃO CONCLUÍDA:`);
    console.log(`   tools_unlocked: ${user.tools_unlocked} → ${updatedUser?.tools_unlocked} ✅`);
    console.log(`   usage_this_month: ${JSON.stringify(updatedUser?.usage_this_month)}`);
    console.log(`   daily_usage: ${JSON.stringify(updatedUser?.daily_usage)}`);

    if (updatedUser?.tools_unlocked) {
      console.log(`\n🎉 USUÁRIO DESBLOQUEADO COM SUCESSO!`);
      console.log(`   ${email} agora pode usar o app normalmente!`);
    } else {
      console.log(`\n⚠️  Algo deu errado, verificar manualmente`);
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 RESUMO');
  console.log('='.repeat(80));
  console.log(`\n✅ ${emails.length} usuários processados`);
  console.log(`\n💡 PRÓXIMOS PASSOS:`);
  console.log(`   1. Pedir para os usuários fazerem LOGOUT e LOGIN novamente`);
  console.log(`   2. Limpar cache do navegador (Ctrl + Shift + Delete)`);
  console.log(`   3. Tentar gerar um stencil`);
  console.log(`   4. Se ainda tiver problema, investigar o código de verificação de acesso`);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Processo concluído!\n');
}

unlockBoletoUsers().catch(console.error);
