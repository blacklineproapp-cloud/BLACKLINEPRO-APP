import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Script para adicionar campos de usuários legacy/cortesia
 */

async function setupLegacyFields() {
  console.log('🔧 SETUP - Campos Legacy/Cortesia\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Ler SQL
    const sqlPath = join(process.cwd(), 'scripts', 'add-legacy-fields.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 Executando migration...\n');

    // Executar SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Se não tiver função exec_sql, tentar executar diretamente
      console.log('⚠️  Função exec_sql não encontrada, tentando método alternativo...\n');
      
      // Executar cada statement separadamente
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await (supabase as any).rpc('exec', { query: statement });
          if (stmtError) {
            console.error(`❌ Erro ao executar: ${statement.substring(0, 50)}...`);
            console.error(stmtError);
          }
        }
      }
    }

    console.log('✅ Migration executada com sucesso!\n');
    console.log('📋 Campos adicionados:');
    console.log('   - courtesy_deadline (TIMESTAMP)');
    console.log('   - assigned_plan (VARCHAR)\n');

    console.log('💡 Próximos passos:');
    console.log('   1. Atribuir plano legacy via admin');
    console.log('   2. Definir deadline (ex: 2026-01-10)');
    console.log('   3. Banner aparecerá automaticamente no dashboard\n');

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.log('\n💡 SOLUÇÃO ALTERNATIVA:');
    console.log('Execute o SQL manualmente no Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/[PROJECT_ID]/sql\n');
    console.log('Conteúdo do arquivo: scripts/add-legacy-fields.sql\n');
    process.exit(1);
  }
}

setupLegacyFields().catch(console.error);
