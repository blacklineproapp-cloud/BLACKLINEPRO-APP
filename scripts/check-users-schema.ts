import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getTableSchema() {
  console.log('🔍 VERIFICANDO SCHEMA DA TABELA USERS');
  console.log('='.repeat(80));

  // Buscar um usuário qualquer para ver as colunas
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log('\n📋 COLUNAS DISPONÍVEIS NA TABELA USERS:');
  console.log('='.repeat(80));
  
  const columns = Object.keys(data);
  columns.sort().forEach((col, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. ${col}`);
  });

  console.log(`\n✅ Total de colunas: ${columns.length}\n`);
}

getTableSchema().catch(console.error);
