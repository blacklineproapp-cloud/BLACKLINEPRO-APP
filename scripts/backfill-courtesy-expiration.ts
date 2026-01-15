
/**
 * Backfill Courtesy Expiration
 * Define data de expiração (30 dias) para usuários que foram ativados manualmente
 * antes da implementação da lógica unificada.
 * 
 * Critério:
 * - is_paid = true
 * - subscription_id IS NULL (indica ativação manual fora do Stripe)
 * - admin_courtesy_expires_at IS NULL
 * - plan != 'free'
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente faltando.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Buscando usuários manuais sem expiração...');

  // Buscar usuários "Paid" sem subscription_id e sem expiração definida
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, plan, created_at')
    .eq('is_paid', true)
    .is('subscription_id', null)
    .is('admin_courtesy_expires_at', null)
    .neq('plan', 'free');

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return;
  }

  console.log(`📊 Encontrados ${users.length} usuários para atualizar.`);

  if (users.length === 0) {
    console.log('✅ Nenhum usuário precisa de backfill.');
    return;
  }

  // Definir data de expiração (30 dias a partir de HOJE)
  const today = new Date();
  const expiresAt = new Date(today);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const expirationString = expiresAt.toISOString();

  console.log(`📅 Definindo expiração para: ${expirationString} (30 dias)`);

  let updatedCount = 0;

  for (const user of users) {
    console.log(`🔄 Atualizando ${user.email} (${user.plan})...`);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        admin_courtesy: true, // Forçar flag
        admin_courtesy_expires_at: expirationString,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar ${user.email}:`, updateError);
    } else {
      updatedCount++;
    }
  }

  console.log(`✅ Backfill concluído! ${updatedCount}/${users.length} usuários atualizados.`);
}

main();
