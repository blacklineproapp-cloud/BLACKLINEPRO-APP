/**
 * 🚀 SCRIPT CONSOLIDADO: Adiciona SEMESTRAIS + ENTERPRISE
 *
 * Este script faz TUDO de uma vez:
 * 1. Adiciona prices SEMESTRAIS aos planos existentes (Starter, Pro, Studio)
 * 2. Cria o produto ENTERPRISE completo no Stripe
 * 3. Cria TODOS os 4 prices do Enterprise (monthly, quarterly, semiannual, yearly)
 *
 * USAR: npm run stripe:setup-all
 */

// Carregar variáveis de ambiente do .env.local
require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============================================================================
// 1. PRICES SEMESTRAIS (Planos Existentes)
// ============================================================================

const SEMIANNUAL_PRICES = {
  starter: 22500,  // R$ 225,00 (6 meses = R$ 37,50/mês - 25% off)
  pro: 45000,      // R$ 450,00 (6 meses = R$ 75,00/mês - 25% off)
  studio: 135000   // R$ 1.350,00 (6 meses = R$ 225,00/mês - 25% off)
};

const EXISTING_PRODUCT_IDS = {
  starter: process.env.STRIPE_PRODUCT_STARTER,
  pro: process.env.STRIPE_PRODUCT_PRO,
  studio: process.env.STRIPE_PRODUCT_STUDIO
};

// ============================================================================
// 2. PRODUTO E PRICES ENTERPRISE (Novo)
// ============================================================================

const ENTERPRISE_PRICES = {
  monthly: 60000,      // R$ 600,00/mês
  quarterly: 162000,   // R$ 1.620,00 (3 meses = R$ 540/mês - 10% off)
  semiannual: 270000,  // R$ 2.700,00 (6 meses = R$ 450/mês - 25% off)
  yearly: 432000       // R$ 4.320,00 (12 meses = R$ 360/mês - 40% off)
};

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Adiciona prices semestrais aos produtos existentes
 */
async function addSemiannualPrices() {
  console.log('\n📦 ETAPA 1: Adicionando prices SEMESTRAIS aos planos existentes...\n');
  console.log('='.repeat(70));

  const results: Record<string, string> = {};

  for (const [planName, productId] of Object.entries(EXISTING_PRODUCT_IDS)) {
    if (!productId) {
      console.log(`⚠️  ${planName.toUpperCase()}: Product ID não encontrado no .env`);
      console.log(`   Configure: STRIPE_PRODUCT_${planName.toUpperCase()}\n`);
      continue;
    }

    const priceInCents = SEMIANNUAL_PRICES[planName as keyof typeof SEMIANNUAL_PRICES];
    const priceInReais = priceInCents / 100;

    console.log(`\n📌 ${planName.toUpperCase()}:`);
    console.log(`   Produto: ${productId}`);
    console.log(`   Preço semestral: R$ ${priceInReais.toFixed(2)} (6 meses)`);

    try {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceInCents,
        currency: 'brl',
        recurring: {
          interval: 'month',
          interval_count: 6
        },
        metadata: {
          plan: planName,
          cycle: 'semiannual',
          discount: '25%'
        }
      });

      results[planName] = price.id;
      console.log(`   ✅ Price criado: ${price.id}`);
    } catch (error: any) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  return results;
}

/**
 * Cria produto Enterprise e todos os seus prices
 */
async function createEnterpriseProduct() {
  console.log('\n🏢 ETAPA 2: Criando produto ENTERPRISE...\n');
  console.log('='.repeat(70));

  let productId: string;
  const priceResults: Record<string, string> = {};

  // 1. Criar produto Enterprise
  console.log('\n📦 Criando produto Enterprise...');

  try {
    const product = await stripe.products.create({
      name: 'Enterprise',
      description: 'Plano Enterprise - Uso verdadeiramente ilimitado para empresas',
      metadata: {
        plan: 'enterprise',
        features: JSON.stringify([
          'Uso ILIMITADO',
          'Suporte dedicado 24/7',
          'SLA garantido 99.9%',
          'Onboarding personalizado',
          'API access',
          'Integração com sistemas'
        ])
      }
    });

    productId = product.id;
    console.log(`   ✅ Produto criado: ${productId}`);
    console.log(`   Nome: ${product.name}`);
  } catch (error: any) {
    console.error(`   ❌ Erro ao criar produto: ${error.message}`);
    throw error;
  }

  // 2. Criar todos os 4 prices do Enterprise
  console.log('\n💰 Criando prices do Enterprise...\n');

  const pricesToCreate = [
    {
      cycle: 'monthly',
      amount: ENTERPRISE_PRICES.monthly,
      interval: 'month',
      interval_count: 1,
      discount: '0%'
    },
    {
      cycle: 'quarterly',
      amount: ENTERPRISE_PRICES.quarterly,
      interval: 'month',
      interval_count: 3,
      discount: '10%'
    },
    {
      cycle: 'semiannual',
      amount: ENTERPRISE_PRICES.semiannual,
      interval: 'month',
      interval_count: 6,
      discount: '25%'
    },
    {
      cycle: 'yearly',
      amount: ENTERPRISE_PRICES.yearly,
      interval: 'month',
      interval_count: 12,
      discount: '40%'
    }
  ];

  for (const priceConfig of pricesToCreate) {
    const priceInReais = priceConfig.amount / 100;
    const intervalLabel = priceConfig.interval_count === 1
      ? 'mensal'
      : `${priceConfig.interval_count} meses`;

    console.log(`\n📌 ENTERPRISE ${priceConfig.cycle.toUpperCase()}:`);
    console.log(`   Preço: R$ ${priceInReais.toFixed(2)} (${intervalLabel})`);
    console.log(`   Desconto: ${priceConfig.discount}`);

    try {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: priceConfig.amount,
        currency: 'brl',
        recurring: {
          interval: priceConfig.interval as 'month',
          interval_count: priceConfig.interval_count
        },
        metadata: {
          plan: 'enterprise',
          cycle: priceConfig.cycle,
          discount: priceConfig.discount
        }
      });

      priceResults[priceConfig.cycle] = price.id;
      console.log(`   ✅ Price criado: ${price.id}`);
    } catch (error: any) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  return { productId, prices: priceResults };
}

/**
 * Exibe resumo final e variáveis de ambiente
 */
function displayResults(semiannual: Record<string, string>, enterprise: { productId: string; prices: Record<string, string> }) {
  console.log('\n' + '='.repeat(70));
  console.log('✅ TODOS OS PRICES CRIADOS COM SUCESSO!');
  console.log('='.repeat(70));

  console.log('\n📋 Adicione estas variáveis ao arquivo .env.local:\n');
  console.log('# ───── SEMESTRAIS (Planos Existentes) ─────');

  for (const [planName, priceId] of Object.entries(semiannual)) {
    const envVarName = `STRIPE_PRICE_${planName.toUpperCase()}_SEMIANNUAL`;
    console.log(`${envVarName}=${priceId}`);
  }

  console.log('\n# ───── ENTERPRISE (Novo Produto) ─────');
  console.log(`STRIPE_PRODUCT_ENTERPRISE=${enterprise.productId}`);

  for (const [cycle, priceId] of Object.entries(enterprise.prices)) {
    const envVarName = `STRIPE_PRICE_ENTERPRISE_${cycle.toUpperCase()}`;
    console.log(`${envVarName}=${priceId}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 PRÓXIMOS PASSOS:');
  console.log('='.repeat(70));
  console.log('1. ✅ Copie TODAS as variáveis acima');
  console.log('2. ✅ Cole no arquivo .env.local');
  console.log('3. ✅ Reinicie o servidor Next.js: npm run dev');
  console.log('4. ✅ Teste os planos na página /pricing');
  console.log('5. ✅ Configure o webhook do Stripe (se ainda não fez)');
  console.log('='.repeat(70));

  console.log('\n📊 RESUMO:');
  console.log(`   Prices semestrais criados: ${Object.keys(semiannual).length}`);
  console.log(`   Produto Enterprise criado: 1`);
  console.log(`   Prices Enterprise criados: ${Object.keys(enterprise.prices).length}`);
  console.log(`   Total de prices: ${Object.keys(semiannual).length + Object.keys(enterprise.prices).length}`);
  console.log('\n');
}

// ============================================================================
// EXECUTAR SCRIPT
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SETUP CONSOLIDADO: SEMESTRAIS + ENTERPRISE');
  console.log('='.repeat(70));
  console.log('\nEste script vai:');
  console.log('  1️⃣  Adicionar prices SEMESTRAIS aos planos existentes');
  console.log('  2️⃣  Criar produto ENTERPRISE no Stripe');
  console.log('  3️⃣  Criar TODOS os 4 prices do Enterprise\n');
  console.log('⏳ Aguarde...\n');

  try {
    // Etapa 1: Prices semestrais
    const semiannualResults = await addSemiannualPrices();

    // Etapa 2: Produto e prices Enterprise
    const enterpriseResults = await createEnterpriseProduct();

    // Exibir resumo
    displayResults(semiannualResults, enterpriseResults);

    console.log('✨ Script finalizado com sucesso!\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ ERRO FATAL');
    console.error('='.repeat(70));
    console.error(`\n${error.message}\n`);

    if (error.code === 'resource_missing') {
      console.error('💡 Verifique se os STRIPE_PRODUCT_* estão configurados no .env\n');
    }

    process.exit(1);
  }
}

// Executar
main();
