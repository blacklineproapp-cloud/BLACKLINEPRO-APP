#!/usr/bin/env tsx
/**
 * Script para ARQUIVAR produtos antigos no Stripe
 *
 * Uso:
 *   npx tsx scripts/archive-stripe-products.ts
 *
 * Este script lista todos os produtos e prices ativos e permite arquivá-los.
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Carregar .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

// IDs dos produtos/preços que queremos MANTER (os novos)
const KEEP_PRICE_IDS = [
  process.env.STRIPE_PRICE_STARTER_MONTHLY,
  process.env.STRIPE_PRICE_PRO_MONTHLY,
  process.env.STRIPE_PRICE_STUDIO_MONTHLY,
].filter(Boolean);

async function listAllProducts() {
  console.log('📦 Listando todos os produtos do Stripe...\n');

  const products = await stripe.products.list({ limit: 100, active: true });
  
  console.log(`Encontrados ${products.data.length} produtos ativos:\n`);

  for (const product of products.data) {
    console.log(`📦 ${product.name} (${product.id})`);
    console.log(`   Descrição: ${product.description || 'N/A'}`);
    console.log(`   Metadata: ${JSON.stringify(product.metadata)}`);
    
    // Listar preços do produto
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 20,
    });

    for (const price of prices.data) {
      const amount = (price.unit_amount || 0) / 100;
      const interval = price.recurring?.interval || 'one-time';
      const isKept = KEEP_PRICE_IDS.includes(price.id) ? '✅ MANTER' : '⚠️ ARQUIVAR';
      
      console.log(`   💰 ${price.id} - R$ ${amount.toFixed(2)}/${interval} ${isKept}`);
    }
    console.log('');
  }

  return products.data;
}

async function archiveProduct(productId: string) {
  console.log(`🗃️  Arquivando produto: ${productId}`);
  
  try {
    // Primeiro, desativar todos os preços do produto
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    for (const price of prices.data) {
      // Pular preços que queremos manter
      if (KEEP_PRICE_IDS.includes(price.id)) {
        console.log(`   ⏭️  Mantendo preço: ${price.id}`);
        continue;
      }

      console.log(`   🗃️  Arquivando preço: ${price.id}`);
      await stripe.prices.update(price.id, { active: false });
    }

    // Verificar se ainda há preços ativos
    const remainingPrices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
    });

    // Se não há mais preços ativos, arquivar o produto
    if (remainingPrices.data.length === 0) {
      console.log(`   🗃️  Arquivando produto...`);
      await stripe.products.update(productId, { active: false });
      console.log(`   ✅ Produto arquivado!`);
    } else {
      console.log(`   ℹ️  Produto mantido ativo (ainda tem preços ativos)`);
    }

  } catch (error: any) {
    console.error(`   ❌ Erro: ${error.message}`);
  }
}

async function archiveOldProducts() {
  console.log('🚀 Iniciando processo de arquivamento...\n');
  console.log('⚠️  Este script vai ARQUIVAR produtos e preços ANTIGOS.');
  console.log(`✅ Preços que serão MANTIDOS: ${KEEP_PRICE_IDS.join(', ')}\n`);

  const products = await stripe.products.list({ limit: 100, active: true });

  // Produtos que vamos arquivar (nomes antigos)
  const oldProductNames = [
    'StencilFlow Editor',
    'StencilFlow Full Access',
    'Editor Only',
    'Full Access',
  ];

  let archivedCount = 0;

  for (const product of products.data) {
    // Verificar se é um produto antigo pelo nome
    const isOldProduct = oldProductNames.some(name => 
      product.name.toLowerCase().includes(name.toLowerCase())
    );

    // Verificar se é um produto antigo pelo metadata
    const isOldByMetadata = 
      product.metadata?.plan_type === 'editor_only' ||
      product.metadata?.plan_type === 'full_access';

    if (isOldProduct || isOldByMetadata) {
      // Verificar se tem preços que queremos manter
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });

      const hasKeptPrices = prices.data.some(p => KEEP_PRICE_IDS.includes(p.id));

      if (!hasKeptPrices) {
        console.log(`\n🗃️  Arquivando: ${product.name} (${product.id})`);
        await archiveProduct(product.id);
        archivedCount++;
      } else {
        console.log(`\n⏭️  Mantendo: ${product.name} (tem preços ativos importantes)`);
      }
    }
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`✅ Processo concluído! ${archivedCount} produtos arquivados.`);
  console.log(`${'='.repeat(60)}\n`);
}

async function archiveSpecificPrices(priceIds: string[]) {
  console.log('🗃️  Arquivando preços específicos...\n');

  for (const priceId of priceIds) {
    try {
      console.log(`   Arquivando: ${priceId}`);
      await stripe.prices.update(priceId, { active: false });
      console.log(`   ✅ Arquivado!`);
    } catch (error: any) {
      console.error(`   ❌ Erro ao arquivar ${priceId}: ${error.message}`);
    }
  }
}

// Menu interativo
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    await listAllProducts();
    return;
  }

  if (args.includes('--archive-all')) {
    await archiveOldProducts();
    return;
  }

  if (args.includes('--archive-price') && args.length > 1) {
    const priceIds = args.filter(a => a.startsWith('price_'));
    if (priceIds.length > 0) {
      await archiveSpecificPrices(priceIds);
    } else {
      console.log('❌ Forneça os IDs dos preços (começam com price_)');
    }
    return;
  }

  // Modo interativo
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        SCRIPT DE ARQUIVAMENTO DE PRODUTOS STRIPE           ║
╠════════════════════════════════════════════════════════════╣
║  Comandos disponíveis:                                     ║
║                                                            ║
║  --list           Lista todos os produtos ativos           ║
║  --archive-all    Arquiva produtos antigos automaticamente ║
║  --archive-price price_xxx  Arquiva preço específico       ║
║                                                            ║
║  Exemplo:                                                  ║
║  npx tsx scripts/archive-stripe-products.ts --list         ║
║  npx tsx scripts/archive-stripe-products.ts --archive-all  ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Listar produtos por padrão
  await listAllProducts();
}

main()
  .then(() => {
    console.log('\n✨ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
