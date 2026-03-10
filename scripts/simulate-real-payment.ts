#!/usr/bin/env npx tsx
/**
 * Simular Pagamento Real do Asaas
 * 
 * Cria uma cobrança real no Asaas e simula o pagamento
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function simulateRealPayment() {
  console.log('🎯 SIMULAÇÃO DE PAGAMENTO REAL ASAAS\n');
  console.log('='.repeat(60));

  // Importar serviços
  const { AsaasCustomerService } = await import('../lib/asaas/customer-service');
  const { AsaasPaymentService } = await import('../lib/asaas/payment-service');
  const { supabaseAdmin } = await import('../lib/supabase');

  console.log('\n📝 Criando usuário de teste...');
  
  const testEmail = `real_payment_${Date.now()}@blacklinepro.com`;
  const testClerkId = `real_clerk_${Date.now()}`;
  
  // 1. Criar usuário no banco
  const { data: testUser } = await supabaseAdmin
    .from('users')
    .insert({
      clerk_id: testClerkId,
      email: testEmail,
      name: 'Teste Pagamento Real',
      plan: 'free',
      is_paid: false,
    })
    .select()
    .single();

  if (!testUser) {
    console.error('❌ Erro ao criar usuário');
    return;
  }

  console.log(`✅ Usuário criado: ${testUser.id}`);

  // 2. Criar customer no Asaas E salvar no banco
  const { asaasCustomer, dbCustomer } = await AsaasCustomerService.findOrCreate({
    userId: testUser.id,
    clerkId: testClerkId,
    email: testEmail,
    name: 'Teste Pagamento Real',
    cpfCnpj: '24971563792',
    phone: '11912345678',
  });

  console.log(`✅ Customer criado: ${asaasCustomer.id}`);

  // 3. Criar cobrança PIX no Asaas
  console.log('\n💰 Criando cobrança PIX de R$ 50,00...');
  
  const { payment, pixQrCode } = await AsaasPaymentService.createPixPayment({
    customerId: asaasCustomer.id,
    value: 50.00,
    description: 'Teste Pagamento Real - Plano Starter',
    externalReference: `real_test_${Date.now()}`,
  });

  console.log(`✅ Cobrança criada: ${payment.id}`);
  console.log(`   Valor: R$ ${payment.value}`);
  console.log(`   Status: ${payment.status}`);
  console.log(`   Vencimento: ${payment.dueDate}`);

  if (pixQrCode) {
    console.log(`\n📱 QR Code PIX gerado!`);
    console.log(`   Expira em: ${pixQrCode.expirationDate}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 PRÓXIMOS PASSOS:\n');
  console.log('1. Acesse: https://sandbox.asaas.com/payments');
  console.log(`2. Busque pela cobrança: ${payment.id}`);
  console.log('3. Clique em "Ações" → "Simular Pagamento"');
  console.log('4. Confirme a simulação');
  console.log('5. O webhook será chamado automaticamente!');
  console.log('\n6. Verifique os logs do ngrok: http://127.0.0.1:4040');
  console.log('7. Execute: npx tsx scripts/check-webhook-events.ts');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 INFORMAÇÕES DA COBRANÇA:\n');
  console.log(`Customer ID: ${asaasCustomer.id}`);
  console.log(`Payment ID: ${payment.id}`);
  console.log(`User ID: ${testUser.id}`);
  console.log(`Email: ${testEmail}`);
}

simulateRealPayment();
