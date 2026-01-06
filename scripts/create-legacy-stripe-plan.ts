import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Stripe from 'stripe';

/**
 * Script para criar Plano Legacy no Stripe
 * 
 * Cria:
 * - 1 Produto: "StencilFlow Legacy"
 * - 4 Preços: Mensal, Trimestral, Semestral, Anual
 * 
 * IMPORTANTE: Copie os Price IDs gerados e adicione no .env.local
 */

async function createLegacyPlan() {
  console.log('🎁 CRIAR PLANO LEGACY NO STRIPE\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error('❌ STRIPE_SECRET_KEY não configurada no .env.local');
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-04-10',
  });

  try {
    // 1. Criar Produto
    console.log('📦 Criando produto Legacy...\n');

    const product = await stripe.products.create({
      name: 'StencilFlow Legacy',
      description: 'Plano especial - Apenas Editor (R$ 25/mês fixo, sem descontos)',
      metadata: {
        plan_type: 'legacy',
        features: 'editor_only',
        generation_limit: '100',
        secret: 'true', // Marca como plano secreto
      },
    });

    console.log(`✅ Produto criado: ${product.id}\n`);

    // 2. Criar Preços (todos R$ 25/mês, sem desconto)
    const prices = [
      {
        nickname: 'Legacy - Mensal',
        interval: 'month' as const,
        amount: 2500, // R$ 25,00
      },
      {
        nickname: 'Legacy - Trimestral',
        interval: 'month' as const,
        interval_count: 3,
        amount: 7500, // R$ 75,00 (R$ 25/mês)
      },
      {
        nickname: 'Legacy - Semestral',
        interval: 'month' as const,
        interval_count: 6,
        amount: 15000, // R$ 150,00 (R$ 25/mês)
      },
      {
        nickname: 'Legacy - Anual',
        interval: 'year' as const,
        amount: 30000, // R$ 300,00 (R$ 25/mês)
      },
    ];

    console.log('💰 Criando preços...\n');

    const createdPrices: Record<string, string> = {};

    for (const priceConfig of prices) {
      const price = await stripe.prices.create({
        product: product.id,
        currency: 'brl',
        recurring: {
          interval: priceConfig.interval,
          interval_count: priceConfig.interval_count || 1,
        },
        unit_amount: priceConfig.amount,
        nickname: priceConfig.nickname,
        metadata: {
          plan_type: 'legacy',
        },
      });

      const key = priceConfig.nickname.split(' - ')[1].toLowerCase();
      createdPrices[key] = price.id;

      console.log(`   ✅ ${priceConfig.nickname}`);
      console.log(`      ID: ${price.id}`);
      console.log(`      Valor: R$ ${(priceConfig.amount / 100).toFixed(2)}\n`);
    }

    // 3. Exibir variáveis de ambiente
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 VARIÁVEIS DE AMBIENTE\n');
    console.log('Adicione estas linhas no seu .env.local:\n');
    console.log(`STRIPE_PRICE_LEGACY_MONTHLY=${createdPrices.mensal}`);
    console.log(`STRIPE_PRICE_LEGACY_QUARTERLY=${createdPrices.trimestral}`);
    console.log(`STRIPE_PRICE_LEGACY_SEMIANNUAL=${createdPrices.semestral}`);
    console.log(`STRIPE_PRICE_LEGACY_YEARLY=${createdPrices.anual}\n`);
    console.log('═══════════════════════════════════════════════════════\n');

    // 4. Resumo
    console.log('✅ PLANO LEGACY CRIADO COM SUCESSO!\n');
    console.log('📊 Resumo:');
    console.log(`   Produto ID: ${product.id}`);
    console.log(`   Nome: ${product.name}`);
    console.log(`   Descrição: ${product.description}\n`);

    console.log('💰 Preços:');
    console.log('   Mensal: R$ 25,00/mês');
    console.log('   Trimestral: R$ 75,00 (R$ 25/mês)');
    console.log('   Semestral: R$ 150,00 (R$ 25/mês)');
    console.log('   Anual: R$ 300,00 (R$ 25/mês)\n');

    console.log('🔒 Plano Secreto:');
    console.log('   - NÃO aparece na página de pricing');
    console.log('   - Apenas acessível via admin');
    console.log('   - Apenas EDITOR (sem ferramentas premium)\n');

    console.log('🎯 Próximos passos:');
    console.log('   1. Copie as variáveis acima para .env.local');
    console.log('   2. Reinicie o servidor: npm run dev');
    console.log('   3. Atribua plano: npx tsx scripts/assign-legacy-plan.ts usuario@email.com\n');

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Verifique se STRIPE_SECRET_KEY está correta no .env.local');
    }
    
    process.exit(1);
  }
}

createLegacyPlan().catch(console.error);
