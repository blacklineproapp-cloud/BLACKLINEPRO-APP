import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeRevenue() {
  console.log('\n💰 ANÁLISE DE RECEITA');
  console.log('='.repeat(80));

  // 1. Receita REAL (pagamentos confirmados)
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('status', 'succeeded');

  const realRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  console.log(`\n✅ RECEITA REAL (Pagamentos Confirmados):`);
  console.log(`   Total: R$ ${realRevenue.toFixed(2)}`);
  console.log(`   Pagamentos: ${payments?.length || 0}`);

  // 2. Usuários com cortesia (aguardando pagamento)
  const { data: courtesyUsers } = await supabase
    .from('users')
    .select('email, plan, admin_courtesy, admin_courtesy_expires_at')
    .eq('admin_courtesy', true)
    .eq('is_paid', true);

  console.log(`\n⏰ CORTESIAS TEMPORÁRIAS (Aguardando Pagamento):`);
  console.log(`   Usuários: ${courtesyUsers?.length || 0}`);
  console.log(`   Expira em: 12/01/2026`);

  // Calcular receita potencial (assumindo R$ 25 starter, R$ 50 pro)
  let potentialRevenue = 0;
  courtesyUsers?.forEach(u => {
    if (u.plan === 'ink') potentialRevenue += 25;
    else if (u.plan === 'pro') potentialRevenue += 50;
    else if (u.plan === 'studio') potentialRevenue += 100;
  });

  console.log(`   Receita Potencial: R$ ${potentialRevenue.toFixed(2)}`);

  console.log(`\n📊 RESUMO:`);
  console.log(`   Receita Real (já recebida): R$ ${realRevenue.toFixed(2)}`);
  console.log(`   Receita Potencial (cortesias): R$ ${potentialRevenue.toFixed(2)}`);
  console.log(`   Total se todos pagarem: R$ ${(realRevenue + potentialRevenue).toFixed(2)}`);

  console.log('\n✅ Análise concluída!\n');
}

analyzeRevenue().catch(console.error);
