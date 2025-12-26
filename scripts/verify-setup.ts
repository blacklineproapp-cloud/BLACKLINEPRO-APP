/**
 * Script de Verificação - StencilFlow Setup
 *
 * Verifica se tudo está configurado antes de deploy
 *
 * USO: npx ts-node scripts/verify-setup.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Carregar .env ou .env.local (Next.js usa .env.local)
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ============================================================================
// VERIFICAÇÕES
// ============================================================================

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

const results: CheckResult[] = [];

function check(name: string, passed: boolean, message: string, critical = false) {
  results.push({ name, passed, message, critical });
  const icon = passed ? '✅' : (critical ? '❌' : '⚠️');
  console.log(`${icon} ${name}: ${message}`);
}

async function main() {
  console.log('\n🔍 VERIFICANDO CONFIGURAÇÃO DO STENCILFLOW\n');
  console.log('═'.repeat(70));

  // ============================================================================
  // 1. VARIÁVEIS DE AMBIENTE BÁSICAS
  // ============================================================================

  console.log('\n📦 1. Variáveis de Ambiente Básicas');
  console.log('─'.repeat(70));

  check(
    'STRIPE_SECRET_KEY',
    !!process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY ? 'Configurado' : 'FALTANDO!',
    true
  );

  check(
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Configurado' : 'FALTANDO!',
    true
  );

  check(
    'SUPABASE_URL',
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurado' : 'FALTANDO!',
    true
  );

  check(
    'SUPABASE_SERVICE_KEY',
    !!process.env.SUPABASE_SERVICE_KEY,
    process.env.SUPABASE_SERVICE_KEY ? 'Configurado' : 'FALTANDO!',
    true
  );

  // ============================================================================
  // 2. BILLING CYCLES - PRICE IDs
  // ============================================================================

  console.log('\n💳 2. Billing Cycles - Price IDs no Stripe');
  console.log('─'.repeat(70));

  const priceVars = [
    // Starter
    'STRIPE_PRICE_STARTER_MONTHLY',
    'STRIPE_PRICE_STARTER_QUARTERLY',
    'STRIPE_PRICE_STARTER_SEMIANNUAL',
    'STRIPE_PRICE_STARTER_YEARLY',
    // Pro
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_PRO_QUARTERLY',
    'STRIPE_PRICE_PRO_SEMIANNUAL',
    'STRIPE_PRICE_PRO_YEARLY',
    // Studio
    'STRIPE_PRICE_STUDIO_MONTHLY',
    'STRIPE_PRICE_STUDIO_QUARTERLY',
    'STRIPE_PRICE_STUDIO_SEMIANNUAL',
    'STRIPE_PRICE_STUDIO_YEARLY',
  ];

  let missingPrices = 0;
  for (const varName of priceVars) {
    const exists = !!process.env[varName];
    if (!exists) missingPrices++;

    check(
      varName,
      exists,
      exists ? `${process.env[varName]}` : 'FALTANDO - Execute create-stripe-prices.ts',
      true
    );
  }

  // ============================================================================
  // 3. STRIPE CONNECTION
  // ============================================================================

  console.log('\n🔗 3. Conexão com Stripe');
  console.log('─'.repeat(70));

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
      });

      const account = await stripe.accounts.retrieve();
      check(
        'Stripe Account',
        true,
        `Conectado: ${account.email || account.id}`,
        false
      );

      // Verificar se Price IDs existem
      if (process.env.STRIPE_PRICE_PRO_MONTHLY) {
        try {
          const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_PRO_MONTHLY);
          check(
            'Price PRO Monthly Válido',
            true,
            `R$ ${(price.unit_amount! / 100).toFixed(2)} - ${price.recurring?.interval}`,
            false
          );
        } catch (e) {
          check(
            'Price PRO Monthly Válido',
            false,
            'Price ID inválido no Stripe!',
            true
          );
        }
      }
    } catch (error: any) {
      check(
        'Stripe Connection',
        false,
        `ERRO: ${error.message}`,
        true
      );
    }
  }

  // ============================================================================
  // 4. SUPABASE CONNECTION
  // ============================================================================

  console.log('\n🗄️  4. Conexão com Supabase');
  console.log('─'.repeat(70));

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Testar query
      const { data, error } = await supabase.from('users').select('count').limit(1);

      check(
        'Supabase Connection',
        !error,
        error ? `ERRO: ${error.message}` : 'Conectado com sucesso',
        true
      );

      // Verificar se migration grace_period foi rodada
      const { data: columns } = await supabase
        .from('users')
        .select('grace_period_until')
        .limit(1);

      check(
        'Migration 003 (Grace Period)',
        columns !== null,
        columns ? 'Migration aplicada' : 'FALTANDO - Rode 003_add_grace_period.sql',
        true
      );

      // Verificar tabela ai_usage
      const { error: usageError } = await supabase.from('ai_usage').select('count').limit(1);

      check(
        'Tabela ai_usage',
        !usageError,
        usageError ? `ERRO: ${usageError.message}` : 'Tabela existe',
        true
      );
    } catch (error: any) {
      check(
        'Supabase Connection',
        false,
        `ERRO: ${error.message}`,
        true
      );
    }
  }

  // ============================================================================
  // RESUMO
  // ============================================================================

  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESUMO DA VERIFICAÇÃO');
  console.log('═'.repeat(70));

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const critical = results.filter(r => !r.passed && r.critical).length;

  console.log(`\nTotal de verificações: ${total}`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`🔴 Críticos: ${critical}\n`);

  if (critical > 0) {
    console.log('❌ CONFIGURAÇÃO INCOMPLETA - Corrija os erros críticos antes de deploy!\n');
    console.log('💡 AÇÕES NECESSÁRIAS:');

    if (missingPrices > 0) {
      console.log(`   1. Execute: npx ts-node scripts/create-stripe-prices.ts`);
    }

    const missingGracePeriod = results.find(r => r.name === 'Migration 003 (Grace Period)' && !r.passed);
    if (missingGracePeriod) {
      console.log(`   2. Execute a migration 003_add_grace_period.sql no Supabase SQL Editor`);
    }

    console.log('');
    process.exit(1);
  } else if (failed > 0) {
    console.log('⚠️  Configuração OK, mas com avisos. Revise antes de deploy.\n');
    process.exit(0);
  } else {
    console.log('✅ TUDO PRONTO! Você pode fazer deploy com segurança.\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n❌ ERRO NA VERIFICAÇÃO:');
  console.error(error);
  process.exit(1);
});
