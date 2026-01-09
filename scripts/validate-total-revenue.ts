import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

async function validateTotalRevenue() {
  console.log('\n💰 VALIDAÇÃO DE RECEITA TOTAL');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // Buscar todos os charges bem-sucedidos do Stripe
  console.log('📥 Buscando todos os charges do Stripe...');
  let allCharges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });
    
    allCharges = [...allCharges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const successfulCharges = allCharges.filter(c => c.status === 'succeeded' && c.paid);
  const totalStripe = successfulCharges.reduce((sum, c) => sum + (c.amount / 100), 0);

  console.log(`✅ Total de charges no Stripe: ${successfulCharges.length}`);
  console.log(`💰 Receita total no Stripe: R$ ${totalStripe.toFixed(2)}\n`);

  console.log('='.repeat(80));
  console.log('📊 COMPARAÇÃO');
  console.log('='.repeat(80));
  console.log(`Stripe:  R$ ${totalStripe.toFixed(2)}`);
  console.log(`Admin:   R$ 3.245,00`);
  
  const difference = Math.abs(totalStripe - 3245);
  
  if (difference < 0.01) {
    console.log(`\n✅ VALORES CONFEREM! Diferença: R$ ${difference.toFixed(2)}`);
  } else {
    console.log(`\n⚠️  DIFERENÇA ENCONTRADA: R$ ${difference.toFixed(2)}`);
    console.log(`   Stripe tem ${totalStripe > 3245 ? 'mais' : 'menos'} que o admin`);
  }

  console.log('\n✅ Validação concluída!\n');
}

validateTotalRevenue().catch(console.error);
