import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lista de emails fornecida pelo usuário
const targetEmails = [
  'alexandro61266@gmail.com',
  'alissonbarreto.ads@gmail.com',
  'coutthomas7@gmail.com',
  'df9187990@gmail.com',
  'erickrussomat@gmail.com',
  'faguinhotattoo9@hotmail.com',
  'feehiwata2930@gmail.com',
  'gabrielfx.fx528@gmail.com',
  'garopaba4k@gmail.com',
  'jeanlagoa@gmail.com',
  'klebyz.tattoo@outlook.com',
  'mackenzyetattooinkoficial@gmail.com',
  'maikydemelo999@gmail.com',
  'marketingadsyuri@gmail.com',
  'mfotatto@gmail.com',
  'orelha_12@hotmail.com',
  'rafaelvaladao.9@gmail.com',
  'wanderpatriota55@gmail.com',
  'yurilojavirtual@gmail.com'
];

async function updateSpecificUsers() {
  console.log('\n⏰ ATUALIZANDO USUÁRIOS ESPECÍFICOS PARA PRAZO DE 3 DIAS');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar todos os usuários da lista
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, plan, is_paid, admin_courtesy, admin_courtesy_expires_at')
    .in('email', targetEmails);

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('❌ Nenhum usuário encontrado!\n');
    return;
  }

  console.log(`📊 ${users.length} usuários encontrados de ${targetEmails.length} emails fornecidos\n`);

  // Identificar emails não encontrados
  const foundEmails = new Set(users.map(u => u.email.toLowerCase()));
  const notFound = targetEmails.filter(email => !foundEmails.has(email.toLowerCase()));
  
  if (notFound.length > 0) {
    console.log('⚠️  Emails NÃO encontrados no banco:');
    notFound.forEach(email => console.log(`   - ${email}`));
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('👥 USUÁRIOS ENCONTRADOS');
  console.log('='.repeat(80) + '\n');

  users.forEach((user, idx) => {
    const expiresAt = user.admin_courtesy_expires_at 
      ? new Date(user.admin_courtesy_expires_at).toLocaleDateString('pt-BR')
      : 'SEM PRAZO';
    
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   Nome: ${user.name || 'N/A'}`);
    console.log(`   Plano: ${user.plan}`);
    console.log(`   is_paid: ${user.is_paid}`);
    console.log(`   admin_courtesy: ${user.admin_courtesy}`);
    console.log(`   Expira em: ${expiresAt}`);
    console.log('');
  });

  // 2. Calcular data de expiração (3 dias a partir de agora)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 3);
  const expirationISO = expirationDate.toISOString();

  console.log('='.repeat(80));
  console.log('⚠️  AÇÃO: Atualizar para cortesia com prazo de 3 dias');
  console.log('='.repeat(80) + '\n');
  console.log(`📅 Nova data de expiração: ${expirationDate.toLocaleString('pt-BR')}`);
  console.log(`⏰ Prazo: 3 dias a partir de agora\n`);

  // 3. Atualizar TODOS os usuários da lista
  const userIds = users.map(u => u.id);
  
  const { error: updateError } = await supabase
    .from('users')
    .update({
      admin_courtesy: true,
      admin_courtesy_expires_at: expirationISO,
      is_paid: true,
      subscription_status: 'active'
    })
    .in('id', userIds);

  if (updateError) {
    console.error('❌ Erro ao atualizar usuários:', updateError.message);
    return;
  }

  console.log(`✅ ${users.length} usuários atualizados com sucesso!\n`);

  console.log('='.repeat(80));
  console.log('📋 O QUE FOI FEITO');
  console.log('='.repeat(80));
  console.log(`1. ✅ Marcados como cortesia (admin_courtesy = true)`);
  console.log(`2. ✅ Ativados temporariamente (is_paid = true)`);
  console.log(`3. ⏰ Prazo de expiração: ${expirationDate.toLocaleDateString('pt-BR')} às ${expirationDate.toLocaleTimeString('pt-BR')}`);
  console.log(`4. 🔒 Após 3 dias sem pagamento: plan = free, is_paid = false\n`);

  console.log('='.repeat(80));
  console.log('📊 RESUMO');
  console.log('='.repeat(80));
  console.log(`Usuários atualizados: ${users.length}`);
  console.log(`Prazo final: ${expirationDate.toLocaleDateString('pt-BR')} às ${expirationDate.toLocaleTimeString('pt-BR')}`);
  console.log(`Ação após expiração: Reverter para FREE (is_paid = false, plan = free)`);
  console.log('\n✅ Atualização concluída!\n');

  // 4. Listar todos os emails atualizados
  console.log('='.repeat(80));
  console.log('📧 EMAILS ATUALIZADOS');
  console.log('='.repeat(80));
  users.forEach(user => {
    console.log(user.email);
  });
  console.log('');
}

updateSpecificUsers().catch(console.error);
