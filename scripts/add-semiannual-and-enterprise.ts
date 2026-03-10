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
  ink: 22500,      // R$ 225,00 (6 meses = R$ 37,50/mês - 25% off)
  pro: 45000,      // R$ 450,00 (6 meses = R$ 75,00/mês - 25% off)
  studio: 135000   // R$ 1.350,00 (6 meses = R$ 225,00/mês - 25% off)
};

const EXISTING_PRODUCT_IDS = {
  ink: process.env.STRIPE_PRODUCT_INK,
  pro: process.env.STRIPE_PRODUCT_PRO,
  studio: process.env.STRIPE_PRODUCT_STUDIO
};

// ============================================================================
// 2. PRODUTO E PRICES ENTERPRISE (Novo)
// ============================================================================

// Enterprise plan has been removed

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

// Enterprise product creation has been removed

/**
 * Exibe resumo final e variáveis de ambiente
 */
function displayResults(semiannual: Record<string, string>) {
  console.log('\n' + '='.repeat(70));
  console.log('✅ TODOS OS PRICES CRIADOS COM SUCESSO!');
  console.log('='.repeat(70));

  console.log('\n📋 Adicione estas variáveis ao arquivo .env.local:\n');
  console.log('# ───── SEMESTRAIS (Planos Existentes) ─────');

  for (const [planName, priceId] of Object.entries(semiannual)) {
    const envVarName = `STRIPE_PRICE_${planName.toUpperCase()}_SEMIANNUAL`;
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
  console.log('\n');
}

// ============================================================================
// EXECUTAR SCRIPT
// ============================================================================

async function runSemiannualSetup() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SETUP CONSOLIDADO: SEMESTRAIS');
  console.log('='.repeat(70));
  console.log('\nEste script vai:');
  console.log('  1️⃣  Adicionar prices SEMESTRAIS aos planos existentes\n');
  console.log('⏳ Aguarde...\n');

  try {
    // Etapa 1: Prices semestrais
    const semiannualResults = await addSemiannualPrices();

    // Exibir resumo
    displayResults(semiannualResults);

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
runSemiannualSetup();
