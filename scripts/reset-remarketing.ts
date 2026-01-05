import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente PRIMEIRO
dotenv.config({ path: '.env.local' });

/**
 * Script para resetar campanhas de remarketing
 * Permite reenviar emails para todos os usuários
 */

async function resetRemarketingCampaigns() {
  console.log('🔄 RESETANDO CAMPANHAS DE REMARKETING\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Criar cliente Supabase diretamente aqui
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Conectado ao Supabase\n');

  try {
    // 1. Contar campanhas existentes
    console.log('1️⃣ Verificando campanhas existentes...');
    const { count: totalCampaigns } = await supabaseAdmin
      .from('remarketing_campaigns')
      .select('*', { count: 'exact', head: true });

    console.log(`   📊 Total de campanhas registradas: ${totalCampaigns || 0}\n`);

    if (!totalCampaigns || totalCampaigns === 0) {
      console.log('✅ Nenhuma campanha para resetar. Tabela já está vazia.\n');
      console.log('═══════════════════════════════════════════════════════');
      return;
    }

    // 2. Mostrar estatísticas por tipo
    console.log('2️⃣ Estatísticas por tipo de campanha:');
    
    const campaigns = ['initial', 'reminder', 'final'] as const;
    for (const campaignType of campaigns) {
      const { count } = await supabaseAdmin
        .from('remarketing_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_type', campaignType);

      const { count: sent } = await supabaseAdmin
        .from('remarketing_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_type', campaignType)
        .eq('email_status', 'sent');

      const { count: failed } = await supabaseAdmin
        .from('remarketing_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_type', campaignType)
        .eq('email_status', 'failed');

      console.log(`   📧 ${campaignType.toUpperCase()}: ${count || 0} total (${sent || 0} enviados, ${failed || 0} falhas)`);
    }

    console.log('\n⚠️  ATENÇÃO: Esta ação irá deletar TODOS os registros de campanhas!');
    console.log('   Isso permitirá reenviar emails para todos os usuários.\n');

    // 3. Deletar todas as campanhas
    console.log('3️⃣ Deletando todas as campanhas...');
    
    const { error: deleteError, count: deletedCount } = await supabaseAdmin
      .from('remarketing_campaigns')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo (condição sempre verdadeira)

    if (deleteError) {
      throw new Error(`Erro ao deletar campanhas: ${deleteError.message}`);
    }

    console.log(`✅ ${deletedCount || totalCampaigns} campanhas deletadas com sucesso!\n`);

    // 4. Verificar se tabela está vazia
    console.log('4️⃣ Verificando resultado...');
    const { count: remainingCount } = await supabaseAdmin
      .from('remarketing_campaigns')
      .select('*', { count: 'exact', head: true });

    if (remainingCount === 0) {
      console.log('✅ Tabela resetada com sucesso! Nenhum registro restante.\n');
    } else {
      console.log(`⚠️  Ainda existem ${remainingCount} registros na tabela.\n`);
    }

    // 5. Mostrar usuários elegíveis agora
    console.log('5️⃣ Usuários elegíveis para remarketing:');
    
    const { count: freeUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_paid', false);

    console.log(`   👥 Total de usuários FREE: ${freeUsers || 0}`);
    
    for (const campaignType of campaigns) {
      const daysRequired = campaignType === 'initial' ? 1 : campaignType === 'reminder' ? 7 : 14;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysRequired);

      const { count: eligible } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_paid', false)
        .lte('created_at', cutoffDate.toISOString());

      console.log(`   📧 ${campaignType.toUpperCase()}: ${eligible || 0} elegíveis (cadastrados há ${daysRequired}+ dias)`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 RESET CONCLUÍDO!\n');
    console.log('Agora você pode enviar campanhas de remarketing novamente através do painel admin.\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar
resetRemarketingCampaigns().catch(console.error);
