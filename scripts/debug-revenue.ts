import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

async function debugRevenue() {
  console.log('\n💰 DEBUG: RECEITA REAL vs BANCO');
  console.log('='.repeat(80));

  // 1. Buscar TODOS os pagamentos do banco
  const { data: allPayments } = await supabase
    .from('payments')
    .select('id, amount, user_id, status, created_at')
    .eq('status', 'succeeded');

  console.log(`\n📊 BANCO DE DADOS:`);
  console.log(`   Total de pagamentos: ${allPayments?.length || 0}`);
  const totalDB = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  console.log(`   Receita total DB: R$ ${totalDB.toFixed(2)}`);

  // 2. Buscar pagamentos do Stripe
  let charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
    });
    charges = [...charges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const successfulCharges = charges.filter(c => c.status === 'succeeded' && c.paid);
  const totalStripe = successfulCharges.reduce((sum, c) => sum + (c.amount / 100), 0);

  console.log(`\n💳 STRIPE:`);
  console.log(`   Total de pagamentos: ${successfulCharges.length}`);
  console.log(`   Receita total Stripe: R$ ${totalStripe.toFixed(2)}`);

  console.log(`\n⚠️  DIFERENÇA:`);
  console.log(`   Pagamentos fantasma no DB: ${(allPayments?.length || 0) - successfulCharges.length}`);
  console.log(`   Receita fantasma: R$ ${(totalDB - totalStripe).toFixed(2)}`);

  console.log(`\n🎯 RECEITA REAL (apenas Stripe): R$ ${totalStripe.toFixed(2)}`);
  console.log(`\n✅ Debug concluído!\n`);
}

debugRevenue().catch(console.error);
