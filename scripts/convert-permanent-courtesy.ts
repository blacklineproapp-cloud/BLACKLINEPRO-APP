import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setCourtesyDeadline() {
  console.log('\n⏰ DEFININDO PRAZO DE 3 DIAS PARA TODAS AS CORTESIAS');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar TODOS os usuários com cortesia (independente de expiração)
  const { data: courtesyUsers, error } = await supabase
    .from('users')
    .select('id, email, name, plan, admin_courtesy, admin_courtesy_granted_at, admin_courtesy_expires_at, is_paid')
    .eq('admin_courtesy', true)
    .eq('is_paid', true);

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    return;
  }

  if (!courtesyUsers || courtesyUsers.length === 0) {
    console.log('✅ Nenhum usuário com cortesia encontrado!\n');
    return;
  }

  console.log(`📊 ${courtesyUsers.length} usuários com cortesia encontrados\n`);

  console.log('='.repeat(80));
  console.log('👥 USUÁRIOS COM CORTESIA');
  console.log('='.repeat(80) + '\n');

  courtesyUsers.forEach((user, idx) => {
    const expiresAt = user.admin_courtesy_expires_at 
      ? new Date(user.admin_courtesy_expires_at).toLocaleDateString('pt-BR')
      : 'SEM PRAZO';
    
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   Nome: ${user.name || 'N/A'}`);
    console.log(`   Plano: ${user.plan}`);
    console.log(`   Expira em: ${expiresAt}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('⚠️  AÇÃO: Atualizar TODAS as cortesias para expirar em 3 dias');
  console.log('='.repeat(80) + '\n');

  // 2. Calcular data de expiração (3 dias a partir de agora)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 3);
  const expirationISO = expirationDate.toISOString();

  console.log(`📅 Nova data de expiração: ${expirationDate.toLocaleString('pt-BR')}`);
  console.log(`⏰ Prazo: 3 dias a partir de agora\n`);

  console.log('⚠️  Confirme que deseja atualizar TODOS os usuários acima.');
  console.log('   Após 3 dias, eles serão bloqueados se não pagarem.\n');

  // 3. Atualizar TODOS os usuários com cortesia
  const { error: updateError } = await supabase
    .from('users')
    .update({
      admin_courtesy_expires_at: expirationISO
    })
    .eq('admin_courtesy', true)
    .eq('is_paid', true);

  if (updateError) {
    console.error('❌ Erro ao atualizar usuários:', updateError.message);
    return;
  }

  console.log(`✅ ${courtesyUsers.length} usuários atualizados com sucesso!\n`);

  console.log('='.repeat(80));
  console.log('📋 O QUE ACONTECE AGORA');
  console.log('='.repeat(80));
  console.log(`1. ⏰ Todos os ${courtesyUsers.length} usuários têm até ${expirationDate.toLocaleDateString('pt-BR')} para pagar`);
  console.log('2. 📧 Sistema deve enviar email notificando sobre o prazo');
  console.log('3. 💳 Usuários podem pagar a qualquer momento para manter acesso');
  console.log('4. 🔒 Após 3 dias sem pagamento, serão bloqueados automaticamente\n');

  console.log('='.repeat(80));
  console.log('📊 RESUMO');
  console.log('='.repeat(80));
  console.log(`Usuários afetados: ${courtesyUsers.length}`);
  console.log(`Prazo final: ${expirationDate.toLocaleDateString('pt-BR')} às ${expirationDate.toLocaleTimeString('pt-BR')}`);
  console.log(`Ação após expiração: Bloqueio automático (is_paid = false)`);
  console.log('\n✅ Atualização concluída!\n');

  // 4. Listar emails para envio de notificação
  console.log('='.repeat(80));
  console.log('📧 EMAILS PARA NOTIFICAÇÃO');
  console.log('='.repeat(80));
  courtesyUsers.forEach(user => {
    console.log(user.email);
  });
  console.log('');
}

setCourtesyDeadline().catch(console.error);
