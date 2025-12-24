#!/usr/bin/env tsx
/**
 * Script para criar produtos e preços no Stripe
 *
 * Uso:
 *   npm run billing:setup
 *
 * Ou diretamente:
 *   tsx scripts/create-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

interface ProductConfig {
  name: string;
  description: string;
  prices: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
}

const PRODUCTS: Record<string, ProductConfig> = {
  editor_only: {
    name: 'StencilFlow Editor',
    description: 'Editor completo de stencil com modos Topográfico e Linhas Perfeitas',
    prices: {
      monthly: 50.00,
      quarterly: 135.00,   // 10% desconto
      yearly: 360.00,      // 40% desconto
    },
  },
  full_access: {
    name: 'StencilFlow Full Access',
    description: 'Acesso completo: Editor + IA GEN + Color Match + Split A4 + Aprimorar',
    prices: {
      monthly: 100.00,
      quarterly: 270.00,   // 10% desconto
      yearly: 720.00,      // 40% desconto
    },
  },
};

async function createProducts() {
  console.log('🚀 Iniciando criação de produtos no Stripe...\n');

  // Verificar se Stripe está configurado
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('sk_test_')) {
    console.log('⚠️  Usando chave de TESTE do Stripe');
  } else {
    console.log('✅ Usando chave de PRODUÇÃO do Stripe');
  }

  const results: Record<string, any> = {};

  for (const [key, config] of Object.entries(PRODUCTS)) {
    console.log(`\n📦 Criando produto: ${config.name}`);
    console.log(`   Descrição: ${config.description}`);

    try {
      // Criar produto
      const product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: {
          plan_type: key,
        },
      });

      console.log(`   ✅ Produto criado: ${product.id}`);
      results[key] = { product_id: product.id, prices: {} };

      // Criar preços
      const intervals: Array<'month' | 'year'> = ['month', 'year'];
      const priceMap = {
        month: { amount: config.prices.monthly, label: 'Mensal' },
        year: { amount: config.prices.yearly, label: 'Anual' },
      };

      for (const interval of intervals) {
        const { amount, label } = priceMap[interval];

        console.log(`   💰 Criando preço ${label}: R$ ${amount.toFixed(2)}/${interval === 'month' ? 'mês' : 'ano'}`);

        const price = await stripe.prices.create({
          product: product.id,
          currency: 'brl',
          unit_amount: Math.round(amount * 100), // Converter para centavos
          recurring: {
            interval: interval,
            interval_count: 1,
          },
          metadata: {
            plan_type: key,
            billing_cycle: interval,
          },
        });

        console.log(`      ✅ Price ID: ${price.id}`);
        results[key].prices[interval] = price.id;
      }

    } catch (error: any) {
      console.error(`   ❌ Erro ao criar produto ${key}:`, error.message);
      throw error;
    }
  }

  // Exibir resumo
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ PRODUTOS CRIADOS COM SUCESSO!');
  console.log('='.repeat(80));
  console.log('\n📋 COPIE E COLE NO SEU .env.local:\n');

  console.log('# Stripe Products - Criados em ' + new Date().toISOString());
  console.log(`STRIPE_PRICE_EDITOR_MONTHLY=${results.editor_only.prices.month}`);
  console.log(`STRIPE_PRICE_EDITOR_YEARLY=${results.editor_only.prices.year}`);
  console.log(`STRIPE_PRICE_FULL_MONTHLY=${results.full_access.prices.month}`);
  console.log(`STRIPE_PRICE_FULL_YEARLY=${results.full_access.prices.year}`);
  console.log('');
  console.log('# Compatibilidade (usar monthly por padrão)');
  console.log(`STRIPE_PRICE_EDITOR=${results.editor_only.prices.month}`);
  console.log(`STRIPE_PRICE_FULL=${results.full_access.prices.month}`);
  console.log(`STRIPE_PRICE_SUBSCRIPTION=${results.editor_only.prices.month}  # deprecated`);
  console.log(`STRIPE_PRICE_TOOLS=${results.full_access.prices.month}  # deprecated`);

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('   1. Copie as variáveis acima e adicione no .env.local');
  console.log('   2. Adicione as mesmas variáveis no Vercel (Settings → Environment Variables)');
  console.log('   3. Configure o webhook no Stripe Dashboard');
  console.log('   4. Faça deploy para produção');
  console.log('\n');

  return results;
}

// Executar
createProducts()
  .then(() => {
    console.log('✨ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
