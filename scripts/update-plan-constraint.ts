import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Script para adicionar 'legacy' à constraint de planos válidos
 */

async function updatePlanConstraint() {
  console.log('🔧 ATUALIZANDO CONSTRAINT DE PLANOS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📄 Executando SQL...\n');

    // SQL direto
    const sql = `
      -- Remover constraint antiga
      ALTER TABLE users DROP CONSTRAINT IF EXISTS check_plan_valid;

      -- Adicionar nova constraint incluindo 'legacy'
      ALTER TABLE users ADD CONSTRAINT check_plan_valid 
        CHECK (plan IN ('free', 'starter', 'pro', 'studio', 'enterprise', 'legacy'));
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      console.log('\n💡 SOLUÇÃO ALTERNATIVA:');
      console.log('Execute manualmente no Supabase SQL Editor:\n');
      console.log('ALTER TABLE users DROP CONSTRAINT IF EXISTS check_plan_valid;');
      console.log("ALTER TABLE users ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'starter', 'pro', 'studio', 'enterprise', 'legacy'));\n");
      process.exit(1);
    }

    console.log('✅ Constraint atualizada com sucesso!\n');
    console.log('📋 Planos válidos agora:');
    console.log('   - free');
    console.log('   - starter');
    console.log('   - pro');
    console.log('   - studio');
    console.log('   - enterprise');
    console.log('   - legacy ✨\n');

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.log('\n💡 Execute manualmente no Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/[PROJECT_ID]/sql\n');
    console.log('SQL:');
    console.log('ALTER TABLE users DROP CONSTRAINT IF EXISTS check_plan_valid;');
    console.log("ALTER TABLE users ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'starter', 'pro', 'studio', 'enterprise', 'legacy'));\n");
    process.exit(1);
  }
}

updatePlanConstraint().catch(console.error);
