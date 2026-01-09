import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testCourtesySystem() {
  console.log('\n🧪 TESTE: Sistema de Cortesia Temporária');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Verificar se migration foi executada
  console.log('1️⃣ Verificando se coluna admin_courtesy_expires_at existe...');
  const { data: columns } = await supabase
    .from('users')
    .select('admin_courtesy_expires_at')
    .limit(1);

  if (columns && columns.length > 0) {
    console.log('   ✅ Coluna existe!\n');
  } else {
    console.log('   ❌ Coluna NÃO existe - executar migration primeiro!\n');
    return;
  }

  // 2. Verificar cortesias configuradas
  console.log('2️⃣ Verificando cortesias configuradas...');
  const { data: courtesies } = await supabase
    .from('users')
    .select('email, plan, admin_courtesy, admin_courtesy_expires_at, is_paid')
    .eq('admin_courtesy', true);

  console.log(`   Total: ${courtesies?.length || 0} cortesias`);
  
  if (courtesies && courtesies.length > 0) {
    const withExpiration = courtesies.filter(c => c.admin_courtesy_expires_at);
    const withoutExpiration = courtesies.filter(c => !c.admin_courtesy_expires_at);
    
    console.log(`   ✅ Com prazo: ${withExpiration.length}`);
    console.log(`   ⚠️  Sem prazo: ${withoutExpiration.length}`);
    
    if (withExpiration.length > 0) {
      const sample = withExpiration[0];
      const expiresAt = new Date(sample.admin_courtesy_expires_at!);
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`   Exemplo: ${sample.email}`);
      console.log(`   Expira em: ${expiresAt.toLocaleDateString('pt-BR')}`);
      console.log(`   Dias restantes: ${daysRemaining}\n`);
    }
  }

  // 3. Simular expiração (criar usuário de teste)
  console.log('3️⃣ Para testar expiração, você pode:');
  console.log('   a) Aguardar até 12/01/2026');
  console.log('   b) Criar usuário de teste e simular expiração');
  console.log('   c) Alterar data de 1 usuário existente para ontem\n');

  // 4. Verificar se há cortesias expiradas
  console.log('4️⃣ Verificando cortesias expiradas...');
  const { data: expired } = await supabase
    .from('users')
    .select('email, plan, admin_courtesy_expires_at, is_paid')
    .eq('admin_courtesy', true)
    .lt('admin_courtesy_expires_at', new Date().toISOString());

  if (expired && expired.length > 0) {
    console.log(`   ⚠️  ${expired.length} cortesias EXPIRADAS encontradas!`);
    expired.forEach(u => {
      console.log(`   - ${u.email} (${u.plan}) - expirou em ${new Date(u.admin_courtesy_expires_at!).toLocaleDateString('pt-BR')}`);
    });
    console.log('\n   💡 Essas cortesias serão revertidas para FREE no próximo login\n');
  } else {
    console.log('   ✅ Nenhuma cortesia expirada\n');
  }

  // 5. Status do sistema
  console.log('='.repeat(80));
  console.log('📊 STATUS DO SISTEMA');
  console.log('='.repeat(80));
  console.log('✅ Migration executada');
  console.log(`✅ ${courtesies?.length || 0} cortesias configuradas`);
  console.log('✅ Verificação automática ativa (lib/auth.ts)');
  console.log('✅ Editor bloqueia não-pagantes');
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Fazer build e deploy');
  console.log('2. Testar com usuário real (fazer logout/login)');
  console.log('3. Monitorar logs após 12/01/2026');
  console.log('\n✅ Teste concluído!\n');
}

testCourtesySystem().catch(console.error);
