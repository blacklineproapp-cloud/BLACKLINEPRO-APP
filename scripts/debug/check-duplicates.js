/**
 * Script para verificar usuários duplicados no Supabase
 *
 * Como usar:
 * node scripts/check-duplicates.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
  console.log('🔍 Procurando usuários duplicados...\n');

  // Buscar todos os usuários
  const { data: users, error } = await supabase
    .from('users')
    .select('id, clerk_id, email, created_at, is_paid, subscription_status, tools_unlocked')
    .order('email');

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    return;
  }

  console.log(`📊 Total de usuários: ${users.length}\n`);

  // Agrupar por email
  const emailGroups = {};
  users.forEach(user => {
    const email = user.email?.toLowerCase() || '';
    if (!emailGroups[email]) {
      emailGroups[email] = [];
    }
    emailGroups[email].push(user);
  });

  // Mostrar duplicados
  const duplicates = Object.entries(emailGroups).filter(([_, users]) => users.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ Nenhum usuário duplicado encontrado!');
    return;
  }

  console.log(`⚠️  Encontrados ${duplicates.length} emails duplicados:\n`);

  duplicates.forEach(([email, users]) => {
    console.log(`📧 ${email} (${users.length} usuários)`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id.substring(0, 8)}...`);
      console.log(`      Clerk ID: ${user.clerk_id || 'null'}`);
      console.log(`      Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
      console.log(`      Assinatura: ${user.is_paid ? '✅ Pago' : '❌ Grátis'}`);
      console.log(`      Status: ${user.subscription_status}`);
      console.log(`      Ferramentas: ${user.tools_unlocked ? '✅ Desbloqueadas' : '❌ Bloqueadas'}`);
    });
    console.log('');
  });

  console.log(`\n💡 Para limpar duplicados, use:\n`);
  console.log(`   GET  http://localhost:3000/api/admin/cleanup-duplicates (ver lista)`);
  console.log(`   POST http://localhost:3000/api/admin/cleanup-duplicates (limpar)\n`);
}

checkDuplicates().catch(console.error);
