import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBlockedUsers() {
  const emails = [
    'joaognr2010@hotmail.com',
    'dgtattooartist10@gmail.com',
    'df9187990@gmail.com'
  ];

  console.log('🔍 VERIFICANDO STATUS DOS 3 USUÁRIOS');
  console.log('='.repeat(80));

  for (const email of emails) {
    console.log(`\n📧 ${email}`);
    console.log('-'.repeat(80));

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log(`❌ Usuário não encontrado!`);
      continue;
    }

    console.log(`✅ Usuário encontrado:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Plano: ${user.plan}`);
    console.log(`   is_paid: ${user.is_paid}`);
    console.log(`   tools_unlocked: ${user.tools_unlocked}`);
    console.log(`   subscription_status: ${user.subscription_status}`);
    console.log(`   is_blocked: ${user.is_blocked}`);
    console.log(`   admin_courtesy: ${user.admin_courtesy}`);

    // Verificar o que está bloqueando
    const problems = [];
    
    if (!user.is_paid) problems.push('❌ is_paid = false');
    if (!user.tools_unlocked && (user.plan === 'pro' || user.plan === 'studio')) {
      problems.push('❌ tools_unlocked = false (deveria ser true para pro/studio)');
    }
    if (user.is_blocked) problems.push('❌ is_blocked = true');
    if (user.subscription_status !== 'active') {
      problems.push(`⚠️  subscription_status = ${user.subscription_status} (deveria ser "active")`);
    }

    if (problems.length > 0) {
      console.log(`\n🚨 PROBLEMAS ENCONTRADOS:`);
      problems.forEach(p => console.log(`   ${p}`));
    } else {
      console.log(`\n✅ Tudo OK! Usuário deveria conseguir usar o app.`);
    }

    // Verificar uso atual
    console.log(`\n📊 USO ATUAL:`);
    console.log(`   usage_this_month: ${JSON.stringify(user.usage_this_month)}`);
    console.log(`   daily_usage: ${JSON.stringify(user.daily_usage)}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Verificação concluída!\n');
}

checkBlockedUsers().catch(console.error);
