import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * ANÁLISE COMPLETA DO SISTEMA STENCILFLOW
 * Verifica se todos os componentes estão linkados corretamente
 */

async function systemAudit() {
  console.log('🔍 ANÁLISE COMPLETA DO SISTEMA STENCILFLOW\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: [] as string[]
  };

  // ============================================================================
  // 1. AUTENTICAÇÃO E USUÁRIOS
  // ============================================================================
  console.log('1️⃣ AUTENTICAÇÃO E USUÁRIOS\n');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, plan, is_paid, subscription_status')
      .limit(5);

    if (error) throw error;

    console.log(`   ✅ Tabela users acessível (${users?.length || 0} usuários)`);
    results.passed++;

    // Verificar se todos têm clerk_id
    const usersWithoutClerkId = users?.filter(u => !u.clerk_id) || [];
    if (usersWithoutClerkId.length > 0) {
      console.log(`   ⚠️  ${usersWithoutClerkId.length} usuários sem clerk_id`);
      results.warnings++;
      results.issues.push(`${usersWithoutClerkId.length} usuários sem clerk_id`);
    } else {
      console.log(`   ✅ Todos os usuários têm clerk_id`);
      results.passed++;
    }

    // Verificar planos
    const planDistribution = users?.reduce((acc, u) => {
      acc[u.plan || 'undefined'] = (acc[u.plan || 'undefined'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   📊 Distribuição de planos:`, planDistribution);

  } catch (error: any) {
    console.log(`   ❌ Erro ao acessar tabela users: ${error.message}`);
    results.failed++;
    results.issues.push(`Erro ao acessar tabela users: ${error.message}`);
  }

  // ============================================================================
  // 2. SISTEMA DE BILLING/ASSINATURAS
  // ============================================================================
  console.log('\n2️⃣ SISTEMA DE BILLING/ASSINATURAS\n');

  try {
    const { data: paidUsers, error } = await supabase
      .from('users')
      .select('id, email, plan, is_paid, subscription_status, subscription_expires_at, stripe_customer_id, asaas_customer_id')
      .eq('is_paid', true)
      .limit(10);

    if (error) throw error;

    console.log(`   ✅ ${paidUsers?.length || 0} usuários pagantes encontrados`);
    results.passed++;

    // Verificar se têm stripe_customer_id ou asaas_customer_id
    const withoutBillingId = paidUsers?.filter(u => !u.stripe_customer_id && !u.asaas_customer_id) || [];
    if (withoutBillingId.length > 0) {
      console.log(`   ⚠️  ${withoutBillingId.length} usuários pagos sem ID de billing (Stripe/Asaas)`);
      results.warnings++;
      results.issues.push(`${withoutBillingId.length} usuários pagos sem ID de billing`);
    } else {
      console.log(`   ✅ Todos os usuários pagos têm ID de billing`);
      results.passed++;
    }

    // Verificar status de assinatura
    const statusDistribution = paidUsers?.reduce((acc, u) => {
      acc[u.subscription_status || 'undefined'] = (acc[u.subscription_status || 'undefined'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   📊 Status de assinaturas:`, statusDistribution);

  } catch (error: any) {
    console.log(`   ❌ Erro ao verificar billing: ${error.message}`);
    results.failed++;
    results.issues.push(`Erro ao verificar billing: ${error.message}`);
  }

  // ============================================================================
  // 3. SISTEMA DE USO/CRÉDITOS
  // ============================================================================
  console.log('\n3️⃣ SISTEMA DE USO/CRÉDITOS\n');

  try {
    // Verificar tabela ai_usage
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage')
      .select('user_id, usage_type, operation_type')
      .gte('created_at', firstDayOfMonth.toISOString())
      .limit(100);

    if (usageError) throw usageError;

    console.log(`   ✅ Tabela ai_usage acessível (${usageData?.length || 0} registros este mês)`);
    results.passed++;

    // Distribuição por tipo
    const typeDistribution = usageData?.reduce((acc, u) => {
      acc[u.usage_type] = (acc[u.usage_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   📊 Uso por tipo:`, typeDistribution);

    // Verificar usage_this_month
    const { data: usersWithUsage } = await supabase
      .from('users')
      .select('usage_this_month')
      .limit(10);

    const usersWithData = usersWithUsage?.filter(u => {
      const usage = u.usage_this_month as Record<string, number> || {};
      return Object.keys(usage).length > 0;
    }) || [];

    if (usersWithData.length === 0) {
      console.log(`   ⚠️  Campo usage_this_month está vazio (sistema legado não usado)`);
      results.warnings++;
    } else {
      console.log(`   ℹ️  ${usersWithData.length}/10 usuários têm usage_this_month preenchido`);
    }

  } catch (error: any) {
    console.log(`   ❌ Erro ao verificar uso: ${error.message}`);
    results.failed++;
    results.issues.push(`Erro ao verificar uso: ${error.message}`);
  }

  // ============================================================================
  // 4. PROJETOS
  // ============================================================================
  console.log('\n4️⃣ PROJETOS\n');

  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, user_id, name, style, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log(`   ✅ Tabela projects acessível (${projects?.length || 0} projetos recentes)`);
    results.passed++;

    // Verificar estilos
    const styleDistribution = projects?.reduce((acc, p) => {
      acc[p.style || 'undefined'] = (acc[p.style || 'undefined'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   📊 Estilos de projetos:`, styleDistribution);

  } catch (error: any) {
    console.log(`   ❌ Erro ao verificar projetos: ${error.message}`);
    results.failed++;
    results.issues.push(`Erro ao verificar projetos: ${error.message}`);
  }

  // ============================================================================
  // 5. ORGANIZAÇÕES
  // ============================================================================
  console.log('\n5️⃣ ORGANIZAÇÕES (MULTI-USER)\n');

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, plan, credits, usage_this_month')
      .limit(5);

    if (error) throw error;

    console.log(`   ✅ Tabela organizations acessível (${orgs?.length || 0} organizações)`);
    results.passed++;

    if (orgs && orgs.length > 0) {
      console.log(`   📊 Planos de organizações:`, orgs.map(o => o.plan));
    }

  } catch (error: any) {
    console.log(`   ⚠️  Tabela organizations não acessível (pode não existir)`);
    results.warnings++;
  }

  // ============================================================================
  // 6. EMAIL (RESEND)
  // ============================================================================
  console.log('\n6️⃣ SISTEMA DE EMAIL\n');

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!resendApiKey) {
    console.log(`   ❌ RESEND_API_KEY não configurada`);
    results.failed++;
    results.issues.push('RESEND_API_KEY não configurada');
  } else {
    console.log(`   ✅ RESEND_API_KEY configurada`);
    results.passed++;
  }

  console.log(`   FROM_EMAIL: ${fromEmail || 'StencilFlow <noreply@stencilflow.com.br>'}`);

  // Verificar tabela de unsubscribes
  try {
    const { data: unsubscribes, error } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .limit(5);

    if (error) {
      console.log(`   ⚠️  Tabela email_unsubscribes não existe (precisa criar)`);
      results.warnings++;
      results.issues.push('Tabela email_unsubscribes não existe');
    } else {
      console.log(`   ✅ Tabela email_unsubscribes existe (${unsubscribes?.length || 0} unsubscribes)`);
      results.passed++;
    }
  } catch (error: any) {
    console.log(`   ⚠️  Erro ao verificar unsubscribes: ${error.message}`);
    results.warnings++;
  }

  // ============================================================================
  // 7. VARIÁVEIS DE AMBIENTE
  // ============================================================================
  console.log('\n7️⃣ VARIÁVEIS DE AMBIENTE\n');

  const requiredEnvVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    'CLERK_SECRET_KEY': process.env.CLERK_SECRET_KEY,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET,
    'ASAAS_API_KEY': process.env.ASAAS_API_KEY,
    'ASAAS_ENVIRONMENT': process.env.ASAAS_ENVIRONMENT,
    'RESEND_API_KEY': process.env.RESEND_API_KEY,
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
  };

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (value) {
      console.log(`   ✅ ${key}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${key} - NÃO CONFIGURADA`);
      results.failed++;
      results.issues.push(`${key} não configurada`);
    }
  });

  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 RESUMO DA ANÁLISE\n');

  const total = results.passed + results.failed + results.warnings;
  const healthScore = Math.round((results.passed / total) * 100);

  console.log(`✅ Verificações Passadas: ${results.passed}`);
  console.log(`❌ Verificações Falhadas: ${results.failed}`);
  console.log(`⚠️  Avisos: ${results.warnings}`);
  console.log(`\n🎯 Score de Saúde: ${healthScore}%\n`);

  if (results.issues.length > 0) {
    console.log('🔴 PROBLEMAS ENCONTRADOS:\n');
    results.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log('');
  }

  // Recomendações
  console.log('💡 RECOMENDAÇÕES:\n');

  if (results.issues.some(i => i.includes('email_unsubscribes'))) {
    console.log('   • Criar tabela email_unsubscribes:');
    console.log('     npx tsx scripts/setup-unsubscribe-table.ts\n');
  }

  if (results.issues.some(i => i.includes('stripe_customer_id'))) {
    console.log('   • Verificar webhooks do Stripe');
    console.log('   • Confirmar que checkout.session.completed está salvando stripe_customer_id\n');
  }

  if (results.issues.some(i => i.includes('clerk_id'))) {
    console.log('   • Verificar webhooks do Clerk');
    console.log('   • Confirmar sincronização Clerk → Supabase\n');
  }

  console.log('═══════════════════════════════════════════════════════\n');

  if (healthScore >= 90) {
    console.log('🎉 SISTEMA EM EXCELENTE ESTADO!\n');
  } else if (healthScore >= 70) {
    console.log('✅ SISTEMA FUNCIONAL - Alguns ajustes recomendados\n');
  } else {
    console.log('⚠️  SISTEMA PRECISA DE ATENÇÃO - Vários problemas encontrados\n');
  }
}

systemAudit().catch(console.error);
