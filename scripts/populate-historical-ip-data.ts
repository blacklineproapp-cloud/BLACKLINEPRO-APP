/**
 * Script: Popular dados históricos de IP (Standalone)
 * 
 * Versão standalone que carrega env vars corretamente
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Carregar .env.local PRIMEIRO
config({ path: resolve(process.cwd(), '.env.local') });

// Verificar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('   Certifique-se que .env.local contém:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function populateHistoricalData() {
  console.log('🔄 Iniciando importação de dados históricos...\n');

  try {
    // 1. Buscar todos os usuários existentes
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, clerk_id, created_at')
      .not('clerk_id', 'is', null);

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
    }

    console.log(`📊 Encontrados ${users?.length || 0} usuários no banco\n`);

    if (!users || users.length === 0) {
      console.log('✅ Nenhum usuário para importar');
      return;
    }

    // 2. Verificar quantos já estão na tabela ip_signups
    const { count: existingCount } = await supabase
      .from('ip_signups')
      .select('*', { count: 'exact', head: true });

    console.log(`📋 Já existem ${existingCount || 0} registros em ip_signups\n`);

    // 3. Importar usuários que ainda não estão na tabela
    const toImport = [];
    for (const user of users) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('ip_signups')
        .select('id')
        .eq('clerk_id', user.clerk_id)
        .single();

      if (!existing) {
        toImport.push({
          ip_address: 'historical',
          email: user.email,
          clerk_id: user.clerk_id,
          user_id: user.id,
          created_at: user.created_at,
          is_blocked: false,
          metadata: {
            imported_at: new Date().toISOString(),
            source: 'historical_import',
            note: 'Usuário existente antes da implementação do sistema anti-abuso'
          }
        });
      }
    }

    console.log(`📥 ${toImport.length} usuários serão importados\n`);

    if (toImport.length === 0) {
      console.log('✅ Todos os usuários já foram importados anteriormente');
      return;
    }

    // 4. Inserir em lotes de 100
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('ip_signups')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, insertError.message);
      } else {
        imported += batch.length;
        console.log(`✅ Importado lote ${i / batchSize + 1}: ${batch.length} usuários (total: ${imported})`);
      }
    }

    console.log(`\n✅ Importação concluída: ${imported} usuários importados\n`);

    // 5. Análise de duplicados
    console.log('🔍 Analisando duplicados...\n');

    const { data: allSignups } = await supabase
      .from('ip_signups')
      .select('email')
      .eq('ip_address', 'historical');

    if (allSignups) {
      const emailCounts = allSignups.reduce((acc: any, row: any) => {
        acc[row.email] = (acc[row.email] || 0) + 1;
        return acc;
      }, {});

      const dupsFound = Object.entries(emailCounts)
        .filter(([_, count]) => (count as number) > 1)
        .sort(([, a], [, b]) => (b as number) - (a as number));

      if (dupsFound.length > 0) {
        console.log(`⚠️  Encontrados ${dupsFound.length} emails com múltiplas contas:\n`);
        dupsFound.slice(0, 10).forEach(([email, count]) => {
          console.log(`   ${email}: ${count} contas`);
        });
      } else {
        console.log('✅ Nenhum email duplicado encontrado');
      }
    }

    // 6. Estatísticas finais
    const { count: totalSignups } = await supabase
      .from('ip_signups')
      .select('*', { count: 'exact', head: true });

    const { count: historicalCount } = await supabase
      .from('ip_signups')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', 'historical');

    console.log('\n📊 Estatísticas Finais:');
    console.log(`   Total de registros: ${totalSignups}`);
    console.log(`   Históricos: ${historicalCount}`);
    console.log(`   Novos (com IP real): ${(totalSignups || 0) - (historicalCount || 0)}`);

  } catch (error: any) {
    console.error('\n❌ Erro durante importação:', error.message);
    throw error;
  }
}

// Executar
populateHistoricalData()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
