/**
 * Script de Limpeza Automática de Dados Antigos
 *
 * Remove dados históricos que não são mais necessários
 * para liberar espaço em disco e RAM
 *
 * Uso: npm run cleanup
 */

import { supabaseAdmin } from '../lib/supabase';

interface CleanupResult {
  table: string;
  deleted: number;
  threshold: string;
}

async function cleanupOldData() {
  console.log('🧹 LIMPEZA DE DADOS ANTIGOS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const results: CleanupResult[] = [];

  try {
    // ============================================
    // 1. WEBHOOK_EVENTS > 30 DIAS (COMPLETED)
    // ============================================
    console.log('📨 1. Limpando webhook_events antigos (> 30 dias)...');

    const webhookThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Contar antes
    const { count: webhooksBefore } = await supabaseAdmin
      .from('webhook_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', webhookThreshold)
      .eq('status', 'completed');

    // Deletar
    const { error: webhookError } = await supabaseAdmin
      .from('webhook_events')
      .delete()
      .lt('created_at', webhookThreshold)
      .eq('status', 'completed');

    if (webhookError) {
      console.log(`   ❌ Erro: ${webhookError.message}`);
    } else {
      const deleted = webhooksBefore || 0;
      results.push({
        table: 'webhook_events',
        deleted,
        threshold: '> 30 dias (completed)'
      });
      console.log(`   ✅ Deletados: ${deleted.toLocaleString()} registros\n`);
    }

    // ============================================
    // 2. AI_USAGE > 90 DIAS
    // ============================================
    console.log('🤖 2. Limpando ai_usage antigo (> 90 dias)...');

    const aiUsageThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Contar antes
    const { count: aiUsageBefore } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', aiUsageThreshold);

    // Deletar
    const { error: aiUsageError } = await supabaseAdmin
      .from('ai_usage')
      .delete()
      .lt('created_at', aiUsageThreshold);

    if (aiUsageError) {
      console.log(`   ❌ Erro: ${aiUsageError.message}`);
    } else {
      const deleted = aiUsageBefore || 0;
      results.push({
        table: 'ai_usage',
        deleted,
        threshold: '> 90 dias'
      });
      console.log(`   ✅ Deletados: ${deleted.toLocaleString()} registros\n`);
    }

    // ============================================
    // 3. USAGE_LOGS > 90 DIAS
    // ============================================
    console.log('📊 3. Limpando usage_logs antigo (> 90 dias)...');

    const usageLogsThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Contar antes
    const { count: usageLogsBefore } = await supabaseAdmin
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', usageLogsThreshold);

    // Deletar
    const { error: usageLogsError } = await supabaseAdmin
      .from('usage_logs')
      .delete()
      .lt('created_at', usageLogsThreshold);

    if (usageLogsError) {
      console.log(`   ❌ Erro: ${usageLogsError.message}`);
    } else {
      const deleted = usageLogsBefore || 0;
      results.push({
        table: 'usage_logs',
        deleted,
        threshold: '> 90 dias'
      });
      console.log(`   ✅ Deletados: ${deleted.toLocaleString()} registros\n`);
    }

    // ============================================
    // 4. IP_TRIAL_USAGE > 60 DIAS
    // ============================================
    console.log('🌐 4. Limpando ip_trial_usage antigo (> 60 dias)...');

    const ipTrialThreshold = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Contar antes
    const { count: ipTrialBefore } = await supabaseAdmin
      .from('ip_trial_usage')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', ipTrialThreshold);

    // Deletar
    const { error: ipTrialError } = await supabaseAdmin
      .from('ip_trial_usage')
      .delete()
      .lt('created_at', ipTrialThreshold);

    if (ipTrialError) {
      console.log(`   ❌ Erro: ${ipTrialError.message}`);
    } else {
      const deleted = ipTrialBefore || 0;
      results.push({
        table: 'ip_trial_usage',
        deleted,
        threshold: '> 60 dias'
      });
      console.log(`   ✅ Deletados: ${deleted.toLocaleString()} registros\n`);
    }

    // ============================================
    // 5. IP_SIGNUPS > 60 DIAS (NÃO BLOQUEADOS)
    // ============================================
    console.log('📍 5. Limpando ip_signups antigo (> 60 dias, não bloqueados)...');

    const ipSignupsThreshold = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Contar antes
    const { count: ipSignupsBefore } = await supabaseAdmin
      .from('ip_signups')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', ipSignupsThreshold)
      .eq('is_blocked', false);

    // Deletar
    const { error: ipSignupsError } = await supabaseAdmin
      .from('ip_signups')
      .delete()
      .lt('created_at', ipSignupsThreshold)
      .eq('is_blocked', false);

    if (ipSignupsError) {
      console.log(`   ❌ Erro: ${ipSignupsError.message}`);
    } else {
      const deleted = ipSignupsBefore || 0;
      results.push({
        table: 'ip_signups',
        deleted,
        threshold: '> 60 dias (não bloqueados)'
      });
      console.log(`   ✅ Deletados: ${deleted.toLocaleString()} registros\n`);
    }

    // ============================================
    // 6. WEBHOOK_LOGS LEGADO (SE EXISTIR)
    // ============================================
    console.log('🗑️  6. Verificando webhook_logs legado...');

    try {
      const { count: webhookLogsBefore } = await supabaseAdmin
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true });

      if (webhookLogsBefore && webhookLogsBefore > 0) {
        console.log(`   ⚠️  Encontrados ${webhookLogsBefore} registros em webhook_logs (tabela legada)`);
        console.log('   ℹ️  Execute migration 007 para migrar e dropar esta tabela\n');
      } else {
        console.log('   ✅ Tabela webhook_logs vazia ou não existe\n');
      }
    } catch (err) {
      console.log('   ✅ Tabela webhook_logs não existe (OK)\n');
    }

    // ============================================
    // RESUMO
    // ============================================
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 RESUMO DA LIMPEZA\n');

    if (results.length > 0) {
      console.table(results);

      const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
      console.log(`\n   Total deletado: ${totalDeleted.toLocaleString()} registros`);

      if (totalDeleted > 1000) {
        console.log('   ✅ Limpeza significativa realizada!');
        console.log('   💡 Recomendado: Executar VACUUM no Supabase para recuperar espaço em disco');
        console.log('      → Supabase Dashboard > SQL Editor > VACUUM ANALYZE;\n');
      } else if (totalDeleted > 0) {
        console.log('   ✅ Limpeza pequena realizada');
      } else {
        console.log('   ℹ️  Nenhum dado antigo para limpar\n');
      }
    } else {
      console.log('   ℹ️  Nenhuma limpeza necessária\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro fatal durante limpeza:', error);
    process.exit(1);
  }
}

// Executar
cleanupOldData()
  .then(() => {
    console.log('✅ Limpeza concluída com sucesso!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
