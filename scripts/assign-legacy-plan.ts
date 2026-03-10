import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * Script para atribuir plano Legacy a um usuário
 * 
 * USO:
 * npx tsx scripts/assign-legacy-plan.ts usuario@email.com
 * 
 * O que faz:
 * 1. Atribui plano 'legacy' ao usuário
 * 2. Retorna URL de checkout do Stripe
 * 3. Usuário paga imediatamente (sem cortesia)
 */

async function assignLegacyPlan() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Uso: npx tsx scripts/assign-legacy-plan.ts usuario@email.com');
    process.exit(1);
  }

  console.log('🎁 ATRIBUIR PLANO LEGACY\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan, is_paid')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error(`❌ Usuário não encontrado: ${email}`);
      process.exit(1);
    }

    console.log(`👤 Usuário encontrado:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name || 'N/A'}`);
    console.log(`   Plano atual: ${user.plan}`);
    console.log(`   Pago: ${user.is_paid ? 'Sim' : 'Não'}\n`);

    // 2. Atribuir plano legacy
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: 'ink',
        // NÃO definir courtesy_deadline - usuário paga na hora
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Erro ao atribuir plano:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Plano Legacy atribuído com sucesso!\n');

    // 3. Gerar URL de checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutUrl = `${appUrl}/api/payments/create-checkout?plan=ink&cycle=monthly`;

    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 PRÓXIMOS PASSOS\n');
    console.log('1. Envie este link para o usuário:');
    console.log(`   ${checkoutUrl}\n`);
    console.log('2. Usuário deve:');
    console.log('   - Clicar no link');
    console.log('   - Inserir dados do cartão');
    console.log('   - Confirmar pagamento de R$ 25/mês\n');
    console.log('3. Após pagamento:');
    console.log('   - is_paid = true');
    console.log('   - subscription_status = active');
    console.log('   - Acesso liberado ao editor\n');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('💡 IMPORTANTE:');
    console.log('   - Plano Legacy: APENAS editor (sem ferramentas premium)');
    console.log('   - Limite: 100 gerações/mês');
    console.log('   - Recorrência: Mensal automática');
    console.log('   - Sem período de cortesia\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    process.exit(1);
  }
}

assignLegacyPlan().catch(console.error);
