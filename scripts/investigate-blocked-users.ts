import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function investigateBlockedUsers() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA - USUÁRIOS BLOQUEADOS');
  console.log('='.repeat(80));

  const emails = [
    'joaognr2010@hotmail.com',
    'dgtattooartist10@gmail.com'
  ];

  for (const email of emails) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📧 INVESTIGANDO: ${email}`);
    console.log('='.repeat(80));

    // 1. Dados do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.log(`❌ Usuário não encontrado!`);
      continue;
    }

    console.log(`\n👤 DADOS DO USUÁRIO:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Plano: ${user.plan}`);
    console.log(`   is_paid: ${user.is_paid}`);
    console.log(`   subscription_status: ${user.subscription_status || 'NULL'}`);
    console.log(`   subscription_id: ${user.subscription_id || 'NULL'}`);
    console.log(`   stripe_customer_id: ${user.stripe_customer_id || 'NULL'}`);
    console.log(`   tools_unlocked: ${user.tools_unlocked}`);
    console.log(`   admin_courtesy: ${user.admin_courtesy}`);
    console.log(`   grace_period_until: ${user.grace_period_until || 'NULL'}`);
    console.log(`   created_at: ${new Date(user.created_at).toLocaleString('pt-BR')}`);

    // 2. Limites de uso
    console.log(`\n📊 LIMITES DE USO:`);
    console.log(`   stencils_generated_today: ${user.stencils_generated_today || 0}`);
    console.log(`   stencils_generated_month: ${user.stencils_generated_month || 0}`);
    console.log(`   last_stencil_reset: ${user.last_stencil_reset || 'NULL'}`);
    console.log(`   chat_messages_today: ${user.chat_messages_today || 0}`);
    console.log(`   last_chat_reset: ${user.last_chat_reset || 'NULL'}`);

    // 3. Pagamentos
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log(`\n💰 PAGAMENTOS (${payments?.length || 0}):`);
    if (payments && payments.length > 0) {
      payments.forEach((p, i) => {
        console.log(`   ${i + 1}. R$ ${p.amount} - ${p.status} - ${p.payment_method} - ${new Date(p.created_at).toLocaleString('pt-BR')}`);
        console.log(`      Charge ID: ${p.stripe_charge_id || 'NULL'}`);
        console.log(`      Customer ID: ${p.stripe_customer_id || 'NULL'}`);
      });
    } else {
      console.log(`   ⚠️  Nenhum pagamento registrado!`);
    }

    // 4. Uso de AI
    const { data: aiUsage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`\n🤖 ÚLTIMOS USOS DE AI (${aiUsage?.length || 0}):`);
    if (aiUsage && aiUsage.length > 0) {
      aiUsage.forEach((ai, i) => {
        console.log(`   ${i + 1}. ${ai.operation_type} - ${ai.model} - ${new Date(ai.created_at).toLocaleString('pt-BR')}`);
        console.log(`      Tokens: ${ai.total_tokens || 0} | Custo: $${ai.cost_usd || 0}`);
      });
    }

    // 5. Projetos
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log(`\n📁 PROJETOS (últimos 3):`);
    if (projects && projects.length > 0) {
      projects.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} - ${new Date(p.created_at).toLocaleString('pt-BR')}`);
      });
    } else {
      console.log(`   ⚠️  Nenhum projeto criado`);
    }

    // 6. Diagnóstico
    console.log(`\n\n🔍 DIAGNÓSTICO:`);
    
    const issues: string[] = [];
    
    if (!user.stripe_customer_id) {
      issues.push('❌ stripe_customer_id está NULL (deveria estar preenchido)');
    }
    
    if (user.plan === 'ink' && user.is_paid) {
      issues.push('⚠️  Plano INK com is_paid=true (inconsistência)');
    }
    
    if (!payments || payments.length === 0) {
      issues.push('❌ Nenhum pagamento registrado na tabela payments');
    }
    
    if (user.stencils_generated_month >= 50 && user.plan === 'ink') {
      issues.push('⚠️  Limite mensal de stencils atingido (50/50)');
    }

    if (user.stencils_generated_today >= 10 && user.plan === 'ink') {
      issues.push('⚠️  Limite diário de stencils atingido (10/10)');
    }

    if (issues.length > 0) {
      console.log(`\n🚨 PROBLEMAS ENCONTRADOS:`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log(`   ✅ Nenhum problema aparente detectado`);
    }

    // 7. Recomendações
    console.log(`\n\n💡 RECOMENDAÇÕES:`);
    
    if (!user.stripe_customer_id) {
      console.log(`   1. Vincular stripe_customer_id ao usuário`);
    }
    
    if (!payments || payments.length === 0) {
      console.log(`   2. Registrar pagamento na tabela payments`);
    }
    
    if (user.stencils_generated_today > 0 || user.stencils_generated_month > 0) {
      console.log(`   3. Resetar limites de uso (stencils_generated_today e stencils_generated_month)`);
    }
    
    if (user.plan === 'ink') {
      console.log(`   4. Verificar plano 'ink' e status de pagamento`);
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log('✅ Investigação concluída!\n');
}

investigateBlockedUsers().catch(console.error);
