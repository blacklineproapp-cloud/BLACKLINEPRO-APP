import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de emails com pagamento confirmado mas status incomplete
const INCOMPLETE_EMAILS = [
  'anacarolinacortezdasilva@gmail.com',
  'andre.damiao1995@gmail.com',
  'caikperes01@gmail.com',
  'cluiz5344@gmail.com',
  'felipeagrabarber@gmail.com',
  'ffabiano001@gmail.com',
  'galvao1807@gmail.com',
  'jamesbryan1719@gmail.com',
  'rangelhenriquee@icloud.com',
  'rickberberian@gmail.com',
  'yanmelo1997@icloud.com',
];

async function fixIncompleteUsers() {
  console.log('🔧 CORRIGINDO USUÁRIOS COM STATUS INCOMPLETE');
  console.log('='.repeat(60));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);
  console.log(`⚡ ${INCOMPLETE_EMAILS.length} usuários para corrigir\n`);

  let success = 0;
  let errors = 0;

  for (const email of INCOMPLETE_EMAILS) {
    console.log(`\n📧 Processando: ${email}`);

    // Buscar usuário
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, plan, subscription_status')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      console.log(`   ❌ Usuário não encontrado`);
      errors++;
      continue;
    }

    console.log(`   📊 Status atual: ${user.subscription_status}`);
    console.log(`   📋 Plano: ${user.plan}`);

    // Atualizar para active
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        is_paid: true,
        tools_unlocked: user.plan === 'pro' || user.plan === 'studio',
      })
      .eq('id', user.id);

    if (updateError) {
      console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
      errors++;
    } else {
      console.log(`   ✅ Atualizado para: active`);
      success++;
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RESULTADO');
  console.log('='.repeat(60));
  console.log(`✅ Sucesso: ${success}`);
  console.log(`❌ Erros: ${errors}`);
  console.log('\n✅ Correção concluída!');
}

fixIncompleteUsers().catch(console.error);
