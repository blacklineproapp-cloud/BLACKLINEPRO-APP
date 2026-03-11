import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * Script de Diagnóstico - Contagem de Uso Mensal
 * Verifica se o dashboard está mostrando o uso correto
 */

async function diagnosticUsageCount() {
  console.log('🔍 DIAGNÓSTICO - CONTAGEM DE USO MENSAL\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Conectado ao Supabase\n');

  try {
    // 1. Buscar todos os usuários
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, clerk_id, email, name, plan, usage_this_month, is_paid')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) throw usersError;

    console.log(`📊 Analisando últimos ${users?.length || 0} usuários...\n`);

    // 2. Para cada usuário, comparar contagens
    for (const user of users || []) {
      console.log(`\n👤 ${user.name || user.email}`);
      console.log(`   Plan: ${user.plan} | Paid: ${user.is_paid ? 'Sim' : 'Não'}`);
      console.log(`   ─────────────────────────────────────────────────`);

      // Método 1: usage_this_month (usado pelo sistema de créditos)
      const usageThisMonth = user.usage_this_month as Record<string, number> || {};
      const totalFromUsageThisMonth = Object.values(usageThisMonth).reduce((sum, val) => sum + (val || 0), 0);

      console.log(`   📈 usage_this_month (sistema de créditos):`);
      console.log(`      Topographic: ${usageThisMonth.topographic || 0}`);
      console.log(`      Lines: ${usageThisMonth.lines || 0}`);
      console.log(`      IA Gen: ${usageThisMonth.ia_gen || 0}`);
      console.log(`      Enhance: ${usageThisMonth.enhance || 0}`);
      console.log(`      Color Match: ${usageThisMonth.color_match || 0}`);
      console.log(`      TOTAL: ${totalFromUsageThisMonth}`);

      // Método 2: ai_usage table (usado pelo dashboard)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: aiUsage, error: aiUsageError } = await supabase
        .from('ai_usage')
        .select('operation_type')
        .eq('user_id', user.id)
        .gte('created_at', firstDayOfMonth.toISOString());

      if (!aiUsageError && aiUsage) {
        const totalFromAiUsage = aiUsage.length;
        const byType = aiUsage.reduce((acc, item) => {
          acc[item.operation_type] = (acc[item.operation_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log(`\n   📊 ai_usage table (usado pelo dashboard):`);
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`      ${type}: ${count}`);
        });
        console.log(`      TOTAL: ${totalFromAiUsage}`);

        // Comparação
        if (totalFromUsageThisMonth !== totalFromAiUsage) {
          console.log(`\n   ⚠️  DIVERGÊNCIA DETECTADA!`);
          console.log(`      usage_this_month: ${totalFromUsageThisMonth}`);
          console.log(`      ai_usage table: ${totalFromAiUsage}`);
          console.log(`      Diferença: ${Math.abs(totalFromUsageThisMonth - totalFromAiUsage)}`);
        } else {
          console.log(`\n   ✅ Contagens estão sincronizadas!`);
        }
      }
    }

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📋 RESUMO\n');
    console.log('O dashboard usa: ai_usage table (conta registros do mês)');
    console.log('O sistema de créditos usa: usage_this_month (JSONB na tabela users)');
    console.log('\nSe houver divergências, o dashboard pode estar mostrando valores incorretos.');
    console.log('\n💡 SOLUÇÃO: Atualizar dashboard para usar usage_this_month\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    process.exit(1);
  }
}

diagnosticUsageCount().catch(console.error);
