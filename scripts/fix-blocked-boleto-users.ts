import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserFix {
  email: string;
  customerId: string;
  chargeId: string;
}

async function fixBlockedBoletoUsers() {
  console.log('🔧 CORRIGINDO USUÁRIOS BLOQUEADOS DE BOLETO');
  console.log('='.repeat(80));

  const usersToFix: UserFix[] = [
    {
      email: 'joaognr2010@hotmail.com',
      customerId: 'cus_TkfWgFFqgvtqa3',
      chargeId: 'py_3SnABXKNrkDOuO210JuNjznP'
    },
    {
      email: 'dgtattooartist10@gmail.com',
      customerId: 'cus_Tka4x5tjckjwra',
      chargeId: 'py_3Sn4umKNrkDOuO211hmhQb6f'
    }
  ];

  for (const userToFix of usersToFix) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔧 CORRIGINDO: ${userToFix.email}`);
    console.log('='.repeat(80));

    // 1. Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userToFix.email)
      .single();

    if (userError || !user) {
      console.log(`❌ Usuário não encontrado!`);
      continue;
    }

    console.log(`\n👤 Usuário encontrado: ${user.name}`);
    console.log(`   Plano atual: ${user.plan}`);
    console.log(`   is_paid: ${user.is_paid}`);
    console.log(`   tools_unlocked: ${user.tools_unlocked}`);
    console.log(`   stripe_customer_id: ${user.stripe_customer_id || 'NULL'}`);

    // 2. Atualizar usuário
    console.log(`\n🔄 Aplicando correções...`);

    const updates: any = {
      tools_unlocked: true,
      stripe_customer_id: userToFix.customerId,
      usage_this_month: {},  // Resetar uso mensal
      daily_usage: {},       // Resetar uso diário
    };

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar usuário:`, updateError);
      continue;
    }

    console.log(`✅ Usuário atualizado com sucesso!`);
    console.log(`   ✅ tools_unlocked: false → true`);
    console.log(`   ✅ stripe_customer_id: NULL → ${userToFix.customerId}`);
    console.log(`   ✅ usage_this_month: resetado`);
    console.log(`   ✅ daily_usage: resetado`);

    // 3. Atualizar pagamento (adicionar charge_id e customer_id)
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (payment) {
      console.log(`\n💰 Atualizando registro de pagamento...`);
      
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          stripe_charge_id: userToFix.chargeId,
          stripe_customer_id: userToFix.customerId,
        })
        .eq('id', payment.id);

      if (paymentError) {
        console.error(`⚠️  Erro ao atualizar pagamento:`, paymentError);
      } else {
        console.log(`✅ Pagamento atualizado com charge_id e customer_id`);
      }
    }

    // 4. Verificar correção
    const { data: updatedUser } = await supabase
      .from('users')
      .select('plan, is_paid, tools_unlocked, stripe_customer_id, usage_this_month, daily_usage')
      .eq('id', user.id)
      .single();

    console.log(`\n✅ VERIFICAÇÃO PÓS-CORREÇÃO:`);
    console.log(`   Plano: ${updatedUser?.plan}`);
    console.log(`   is_paid: ${updatedUser?.is_paid}`);
    console.log(`   tools_unlocked: ${updatedUser?.tools_unlocked}`);
    console.log(`   stripe_customer_id: ${updatedUser?.stripe_customer_id}`);
    console.log(`   usage_this_month: ${JSON.stringify(updatedUser?.usage_this_month)}`);
    console.log(`   daily_usage: ${JSON.stringify(updatedUser?.daily_usage)}`);

    if (updatedUser?.tools_unlocked && updatedUser?.stripe_customer_id) {
      console.log(`\n🎉 USUÁRIO LIBERADO COM SUCESSO!`);
    } else {
      console.log(`\n⚠️  Algo ainda está errado, verificar manualmente`);
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 RESUMO DA CORREÇÃO');
  console.log('='.repeat(80));
  console.log(`\n✅ ${usersToFix.length} usuários processados`);
  console.log(`\n💡 PRÓXIMOS PASSOS:`);
  console.log(`   1. Pedir para os usuários fazerem logout e login novamente`);
  console.log(`   2. Verificar se conseguem acessar o app normalmente`);
  console.log(`   3. Se ainda tiver problema, verificar o código de verificação de acesso`);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Correção concluída!\n');
}

fixBlockedBoletoUsers().catch(console.error);
