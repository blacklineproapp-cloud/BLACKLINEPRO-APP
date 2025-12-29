#!/usr/bin/env tsx
/**
 * Script para criar produtos e preços no Stripe
 * 
 * ATUALIZADO: Dezembro 2025
 * - Novos planos: Starter (R$50), Pro (R$100), Studio (R$300)
 *
 * Uso:
 *   npm run billing:setup
 *
 * Ou diretamente:
 *   npx tsx scripts/create-stripe-products.ts
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
    semiannual: number;
    yearly: number;
  };
}

const PRODUCTS: Record<string, ProductConfig> = {
  starter: {
    name: 'StencilFlow Starter',
    description: 'Editor completo de stencil com modos Topográfico e Linhas Perfeitas. 100 gerações/mês.',
    prices: {
      monthly: 50.00,
      quarterly: 135.00,   // 10% desconto (R$ 45/mês)
      semiannual: 225.00,  // 25% desconto (R$ 37.50/mês)
      yearly: 360.00,      // 40% desconto (R$ 30/mês)
    },
  },
  pro: {
    name: 'StencilFlow Pro',
    description: 'Acesso completo: Editor + IA GEN + Color Match + Split A4 + Aprimorar. 500 gerações/mês.',
    prices: {
      monthly: 100.00,
      quarterly: 270.00,   // 10% desconto (R$ 90/mês)
      semiannual: 450.00,  // 25% desconto (R$ 75/mês)
      yearly: 720.00,      // 40% desconto (R$ 60/mês)
    },
  },
  studio: {
    name: 'StencilFlow Studio',
    description: 'Uso ilimitado para estúdios. Todas as ferramentas + suporte prioritário.',
    prices: {
      monthly: 300.00,
      quarterly: 810.00,   // 10% desconto (R$ 270/mês)
      semiannual: 1350.00, // 25% desconto (R$ 225/mês)
      yearly: 2160.00,     // 40% desconto (R$ 180/mês)
    },
  },
};

async function createProducts() {
  console.log('🚀 Iniciando criação de produtos no Stripe...\n');

  // Verificar se Stripe está configurado
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY não configurada!');
    process.exit(1);
  }

  if (process.env.STRIPE_SECRET_KEY.includes('sk_test_')) {
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
          created_at: new Date().toISOString(),
        },
      });

      console.log(`   ✅ Produto criado: ${product.id}`);
      results[key] = { product_id: product.id, prices: {} };

      // Criar preços (mensal, trimestral, semestral, anual)
      const intervals: Array<{ interval: 'month' | 'year', count: number, key: string, label: string }> = [
        { interval: 'month', count: 1, key: 'monthly', label: 'Mensal' },
        { interval: 'month', count: 3, key: 'quarterly', label: 'Trimestral' },
        { interval: 'month', count: 6, key: 'semiannual', label: 'Semestral' },
        { interval: 'year', count: 1, key: 'yearly', label: 'Anual' },
      ];

      for (const { interval, count, key: priceKey, label } of intervals) {
        const amount = config.prices[priceKey as keyof typeof config.prices];

        console.log(`   💰 Criando preço ${label}: R$ ${amount.toFixed(2)}`);

        const price = await stripe.prices.create({
          product: product.id,
          currency: 'brl',
          unit_amount: Math.round(amount * 100), // Converter para centavos
          recurring: {
            interval: interval,
            interval_count: count,
          },
          metadata: {
            plan_type: key,
            billing_cycle: priceKey,
          },
        });

        console.log(`      ✅ Price ID: ${price.id}`);
        results[key].prices[priceKey] = price.id;
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

  console.log('# ============================================');
  console.log('# STRIPE PRICES - Planos de Assinatura');
  console.log('# Criados em ' + new Date().toISOString());
  console.log('# ============================================');
  console.log('');
  console.log('# Starter - R$ 50/mês (100 gerações)');
  console.log(`STRIPE_PRICE_STARTER_MONTHLY=${results.starter.prices.monthly}`);
  console.log(`STRIPE_PRICE_STARTER_QUARTERLY=${results.starter.prices.quarterly}`);
  console.log(`STRIPE_PRICE_STARTER_SEMIANNUAL=${results.starter.prices.semiannual}`);
  console.log(`STRIPE_PRICE_STARTER_YEARLY=${results.starter.prices.yearly}`);
  console.log('');
  console.log('# Pro - R$ 100/mês (500 gerações)');
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${results.pro.prices.monthly}`);
  console.log(`STRIPE_PRICE_PRO_QUARTERLY=${results.pro.prices.quarterly}`);
  console.log(`STRIPE_PRICE_PRO_SEMIANNUAL=${results.pro.prices.semiannual}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${results.pro.prices.yearly}`);
  console.log('');
  console.log('# Studio - R$ 300/mês (Ilimitado)');
  console.log(`STRIPE_PRICE_STUDIO_MONTHLY=${results.studio.prices.monthly}`);
  console.log(`STRIPE_PRICE_STUDIO_QUARTERLY=${results.studio.prices.quarterly}`);
  console.log(`STRIPE_PRICE_STUDIO_SEMIANNUAL=${results.studio.prices.semiannual}`);
  console.log(`STRIPE_PRICE_STUDIO_YEARLY=${results.studio.prices.yearly}`);

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('   1. Copie as variáveis acima e adicione no .env.local');
  console.log('   2. Adicione as mesmas variáveis no Vercel (Settings → Environment Variables)');
  console.log('   3. Configure o webhook no Stripe Dashboard');
  console.log('   4. Arquive os produtos antigos: npx tsx scripts/archive-stripe-products.ts --archive-all');
  console.log('   5. Faça deploy para produção');
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
