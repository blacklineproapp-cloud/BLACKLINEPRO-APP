require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Script: Adicionar Preços Semestrais
 * Cria os preços semestrais para Starter, Pro e Studio no Stripe
 */

async function addSemiannualPrices() {
  console.log('🚀 Iniciando criação de preços semestrais...\n');

  // Verificar se Stripe está configurado
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY não configurada no .env.local');
    process.exit(1);
  }

  // IDs dos produtos corretos (os mais recentes)
  const PRODUCTS = {
    'STARTER': 'prod_TftI3BwyyaAYab',
    'PRO': 'prod_TftIIjYoGaIjP3',
    'STUDIO': 'prod_TftIt1Rib3c7ih'
  };

  // Preços semestrais (6 meses com 25% de desconto)
  const SEMIANNUAL_PRICES = {
    'STARTER': 22500,  // R$ 225,00 (R$ 37,50/mês - 25% off)
    'PRO': 45000,      // R$ 450,00 (R$ 75,00/mês - 25% off)
    'STUDIO': 135000   // R$ 1.350,00 (R$ 225,00/mês - 25% off)
  };

  try {
    // Criar preços semestrais
    for (const [plan, productId] of Object.entries(PRODUCTS)) {
      const priceAmount = SEMIANNUAL_PRICES[plan];
      
      console.log(`\n📦 Criando preço semestral para ${plan}...`);
      console.log(`   Produto ID: ${productId}`);
      console.log(`   Valor: R$ ${(priceAmount / 100).toFixed(2)} (6 meses)`);
      console.log(`   Equivalente mensal: R$ ${(priceAmount / 600).toFixed(2)}`);

      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceAmount,
        currency: 'brl',
        recurring: {
          interval: 'month',
          interval_count: 6
        },
        nickname: `Black Line Pro ${plan.charAt(0) + plan.slice(1).toLowerCase()} - Semestral (25% off)`,
        metadata: {
          plan: plan.toLowerCase(),
          cycle: 'semiannual',
          discount: '25%',
          monthly_equivalent: (priceAmount / 600).toFixed(2)
        }
      });

      console.log(`   ✅ Price ID criado: ${price.id}`);
      console.log(`   📋 Adicione ao .env.local:`);
      console.log(`   STRIPE_PRICE_${plan}_SEMIANNUAL=${price.id}`);
    }

    console.log('\n\n✅ Todos os preços semestrais foram criados com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Copie os Price IDs acima');
    console.log('2. Adicione-os ao arquivo .env.local');
    console.log('3. Reinicie o servidor de desenvolvimento');
    console.log('4. Teste os checkouts semestrais\n');

  } catch (error) {
    console.error('\n❌ Erro ao criar preços:', error.message);
    if (error.type) console.error('   Tipo:', error.type);
    if (error.raw) console.error('   Detalhes:', error.raw.message);
    process.exit(1);
  }
}

// Executar
addSemiannualPrices();
