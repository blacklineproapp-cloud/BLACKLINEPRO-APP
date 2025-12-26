/**
 * Script para criar Price IDs no Stripe automaticamente
 *
 * USO:
 * 1. Configure STRIPE_SECRET_KEY no .env
 * 2. Execute: npx ts-node scripts/create-stripe-prices.ts
 * 3. Copie as variáveis de ambiente geradas
 *
 * IMPORTANTE: Execute apenas UMA vez! Prices duplicados custam dinheiro.
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carregar .env ou .env.local (Next.js usa .env.local)
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  console.log('📂 Carregando .env.local...\n');
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log('📂 Carregando .env...\n');
  dotenv.config({ path: envPath });
} else {
  console.error('❌ ERRO: Nenhum arquivo .env ou .env.local encontrado!');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// ============================================================================
// CONFIGURAÇÃO DOS PLANOS
// ============================================================================

interface PlanConfig {
  name: string;
  productId?: string; // Se já existe, passar ID. Senão, cria novo.
  prices: {
    monthly: number;
    quarterly: number;
    semiannual: number;
    yearly: number;
  };
}

const PLANS: Record<string, PlanConfig> = {
  starter: {
    name: 'StencilFlow Starter',
    productId: process.env.STRIPE_PRODUCT_STARTER, // Se já tem, usar
    prices: {
      monthly: 50.00,      // R$ 50/mês
      quarterly: 135.00,   // R$ 45/mês (10% off)
      semiannual: 225.00,  // R$ 37.50/mês (25% off)
      yearly: 360.00       // R$ 30/mês (40% off)
    }
  },
  pro: {
    name: 'StencilFlow Pro',
    productId: process.env.STRIPE_PRODUCT_PRO,
    prices: {
      monthly: 100.00,     // R$ 100/mês
      quarterly: 270.00,   // R$ 90/mês (10% off)
      semiannual: 450.00,  // R$ 75/mês (25% off)
      yearly: 720.00       // R$ 60/mês (40% off)
    }
  },
  studio: {
    name: 'StencilFlow Studio',
    productId: process.env.STRIPE_PRODUCT_STUDIO,
    prices: {
      monthly: 300.00,      // R$ 300/mês
      quarterly: 810.00,    // R$ 270/mês (10% off)
      semiannual: 1350.00,  // R$ 225/mês (25% off)
      yearly: 2160.00       // R$ 180/mês (40% off)
    }
  }
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

async function getOrCreateProduct(plan: string, config: PlanConfig): Promise<string> {
  // Se Product ID já existe, retornar
  if (config.productId) {
    console.log(`✓ Produto ${plan} já existe: ${config.productId}`);
    return config.productId;
  }

  // Criar novo produto
  console.log(`⏳ Criando produto ${plan}...`);
  const product = await stripe.products.create({
    name: config.name,
    description: `Plano ${plan.toUpperCase()} - StencilFlow`,
    metadata: {
      plan: plan,
      created_by: 'create-stripe-prices script'
    }
  });

  console.log(`✅ Produto ${plan} criado: ${product.id}`);
  return product.id;
}

async function createPrice(
  productId: string,
  plan: string,
  cycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly',
  amount: number
): Promise<string> {
  const intervalMap = {
    monthly: { interval: 'month' as const, interval_count: 1 },
    quarterly: { interval: 'month' as const, interval_count: 3 },
    semiannual: { interval: 'month' as const, interval_count: 6 },
    yearly: { interval: 'year' as const, interval_count: 1 }
  };

  const { interval, interval_count } = intervalMap[cycle];

  console.log(`⏳ Criando price ${plan} ${cycle}...`);

  const price = await stripe.prices.create({
    product: productId,
    currency: 'brl',
    unit_amount: Math.round(amount * 100), // Converter para centavos
    recurring: {
      interval,
      interval_count
    },
    metadata: {
      plan,
      cycle,
      created_by: 'create-stripe-prices script'
    }
  });

  console.log(`✅ Price ${plan} ${cycle} criado: ${price.id}`);
  return price.id;
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('\n🚀 CRIANDO PRICE IDS NO STRIPE\n');
  console.log('═'.repeat(60));

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ ERRO: STRIPE_SECRET_KEY não encontrado no .env');
    process.exit(1);
  }

  const envVars: string[] = [];

  for (const [planKey, config] of Object.entries(PLANS)) {
    console.log(`\n📦 PLANO: ${planKey.toUpperCase()}`);
    console.log('─'.repeat(60));

    // 1. Criar ou obter Product
    const productId = await getOrCreateProduct(planKey, config);
    envVars.push(`STRIPE_PRODUCT_${planKey.toUpperCase()}=${productId}`);

    // 2. Verificar se price monthly já existe
    const existingMonthlyEnvVar = `STRIPE_PRICE_${planKey.toUpperCase()}_MONTHLY`;
    const existingMonthly = process.env[existingMonthlyEnvVar];

    if (existingMonthly) {
      console.log(`✓ Price monthly já existe: ${existingMonthly}`);
      envVars.push(`${existingMonthlyEnvVar}=${existingMonthly}`);
    } else {
      // Criar monthly
      const monthlyPriceId = await createPrice(productId, planKey, 'monthly', config.prices.monthly);
      envVars.push(`${existingMonthlyEnvVar}=${monthlyPriceId}`);
    }

    // 3. Criar prices para quarterly, semiannual, yearly
    for (const cycle of ['quarterly', 'semiannual', 'yearly'] as const) {
      const envVar = `STRIPE_PRICE_${planKey.toUpperCase()}_${cycle.toUpperCase()}`;

      // Verificar se já existe
      if (process.env[envVar]) {
        console.log(`✓ Price ${cycle} já existe: ${process.env[envVar]}`);
        envVars.push(`${envVar}=${process.env[envVar]}`);
      } else {
        const priceId = await createPrice(productId, planKey, cycle, config.prices[cycle]);
        envVars.push(`${envVar}=${priceId}`);
      }
    }
  }

  // ============================================================================
  // EXIBIR RESULTADO
  // ============================================================================

  console.log('\n' + '═'.repeat(60));
  console.log('✅ TODAS AS PRICES FORAM CRIADAS COM SUCESSO!');
  console.log('═'.repeat(60));

  console.log('\n📝 COPIE ESTAS VARIÁVEIS PARA SEU .env:\n');
  console.log('─'.repeat(60));
  envVars.forEach(line => console.log(line));
  console.log('─'.repeat(60));

  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Copie as variáveis acima e cole no arquivo .env');
  console.log('2. Reinicie o servidor Next.js');
  console.log('3. Teste o checkout com diferentes billing cycles');
  console.log('4. Verifique no Stripe Dashboard se as prices estão corretas\n');
}

// Executar script
main().catch((error) => {
  console.error('\n❌ ERRO AO CRIAR PRICES:');
  console.error(error);
  process.exit(1);
});
