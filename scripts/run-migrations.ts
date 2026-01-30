#!/usr/bin/env npx tsx
/**
 * Executar Migrações de Constraints
 * 
 * Adiciona constraints UNIQUE necessárias para o Asaas
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function runMigrations() {
  console.log('🚀 EXECUTANDO MIGRAÇÕES DE CONSTRAINTS\n');
  console.log('='.repeat(60));

  const { supabaseAdmin } = await import('../lib/supabase');

  try {
    // 1. Adicionar UNIQUE em customers.user_id
    console.log('\n📋 Adicionando UNIQUE em customers.user_id...');
    
    const { error: customerError } = await supabaseAdmin.rpc('exec', {
      query: 'ALTER TABLE customers ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);'
    });

    if (customerError) {
      if (customerError.message.includes('already exists')) {
        console.log('ℹ️ Constraint já existe em customers.user_id');
      } else {
        console.error('Erro:', customerError.message);
        // Tentar via query direta
        const { error: directError } = await supabaseAdmin
          .from('customers')
          .select('count')
          .limit(0);
        
        if (!directError) {
          console.log('⚠️ Não foi possível adicionar via RPC, execute manualmente no Supabase');
        }
      }
    } else {
      console.log('✅ Constraint UNIQUE adicionada em customers.user_id');
    }

    // 2. Adicionar índice
    console.log('\n📋 Adicionando índice em customers.user_id...');
    await supabaseAdmin.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);'
    });

    // 3. Adicionar UNIQUE em payments.asaas_payment_id
    console.log('\n📋 Adicionando UNIQUE em payments.asaas_payment_id...');
    
    const { error: paymentError } = await supabaseAdmin.rpc('exec', {
      query: 'ALTER TABLE payments ADD CONSTRAINT payments_asaas_payment_id_unique UNIQUE (asaas_payment_id);'
    });

    if (paymentError) {
      if (paymentError.message.includes('already exists')) {
        console.log('ℹ️ Constraint já existe em payments.asaas_payment_id');
      } else {
        console.error('Erro:', paymentError.message);
      }
    } else {
      console.log('✅ Constraint UNIQUE adicionada em payments.asaas_payment_id');
    }

    // 4. Adicionar índice
    console.log('\n📋 Adicionando índice em payments.asaas_payment_id...');
    await supabaseAdmin.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_payments_asaas_payment_id ON payments(asaas_payment_id);'
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRAÇÕES EXECUTADAS!\n');

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n📋 EXECUTE MANUALMENTE NO SUPABASE SQL EDITOR:\n');
    console.log('-- Constraint em customers');
    console.log('ALTER TABLE customers ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);\n');
    console.log('-- Constraint em payments');
    console.log('ALTER TABLE payments ADD CONSTRAINT payments_asaas_payment_id_unique UNIQUE (asaas_payment_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_payments_asaas_payment_id ON payments(asaas_payment_id);\n');
  }
}

runMigrations();
