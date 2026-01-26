/**
 * Script para Sincronizar Pagamentos Faltantes do Stripe
 * 
 * Este script encontra PaymentIntents que foram concluídos no Stripe
 * mas não estão registrados no banco de dados e os adiciona.
 * 
 * IMPORTANTE: Execute primeiro o compare-stripe-db.ts para ver o estado atual
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

// Mapeamento de price_id para plano
function getPlanFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'starter',
    [process.env.STRIPE_PRICE_STARTER_QUARTERLY!]: 'starter',
    [process.env.STRIPE_PRICE_STARTER_SEMIANNUAL!]: 'starter',
    [process.env.STRIPE_PRICE_STARTER_YEARLY!]: 'starter',
    [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'pro',
    [process.env.STRIPE_PRICE_PRO_QUARTERLY!]: 'pro',
    [process.env.STRIPE_PRICE_PRO_SEMIANNUAL!]: 'pro',
    [process.env.STRIPE_PRICE_PRO_YEARLY!]: 'pro',
    [process.env.STRIPE_PRICE_STUDIO_MONTHLY!]: 'studio',
    [process.env.STRIPE_PRICE_STUDIO_QUARTERLY!]: 'studio',
    [process.env.STRIPE_PRICE_STUDIO_SEMIANNUAL!]: 'studio',
    [process.env.STRIPE_PRICE_STUDIO_YEARLY!]: 'studio',
    [process.env.STRIPE_PRICE_LEGACY_MONTHLY!]: 'legacy',
  };
  return priceMap[priceId] || 'starter';
}

// Determinar plano pelo valor
function getPlanFromAmount(amount: number): string {
  const amountInReais = amount / 100;
  if (amountInReais >= 300) return 'studio';
  if (amountInReais >= 100) return 'pro';
  if (amountInReais >= 50) return 'starter';
  return 'legacy'; // R$ 25
}

async function syncMissingPayments() {
  console.log('🔄 SINCRONIZAÇÃO DE PAGAMENTOS STRIPE -> DB');
  console.log('='.repeat(80));

  // 1. Buscar todos os PaymentIntents succeeded do Stripe
  console.log('📥 Buscando PaymentIntents no Stripe...');
  let stripePaymentIntents: Stripe.PaymentIntent[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.paymentIntents.list({
      limit: 100,
      starting_after: startingAfter,
    });
    stripePaymentIntents = [...stripePaymentIntents, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const succeededPIs = stripePaymentIntents.filter(pi => pi.status === 'succeeded');
  console.log(`✅ Stripe: ${succeededPIs.length} PaymentIntents succeeded`);

  // 2. Buscar pagamentos existentes no DB
  console.log('📥 Buscando pagamentos existentes no DB...');
  const { data: dbPayments, error } = await supabase
    .from('payments')
    .select('stripe_payment_id, stripe_payment_intent_id');

  if (error) {
    console.error('❌ Erro ao buscar DB:', error);
    return;
  }

  // Criar set de IDs existentes
  const existingPIIds = new Set<string>();
  dbPayments.forEach(p => {
    if (p.stripe_payment_intent_id) existingPIIds.add(p.stripe_payment_intent_id);
    if (p.stripe_payment_id?.startsWith('pi_')) existingPIIds.add(p.stripe_payment_id);
  });

  console.log(`✅ DB: ${dbPayments.length} pagamentos (${existingPIIds.size} com PI ID)`);

  // 3. Encontrar PaymentIntents faltantes
  const missingPIs = succeededPIs.filter(pi => !existingPIIds.has(pi.id));
  console.log(`\n⚠️ FALTANTES: ${missingPIs.length} pagamentos`);

  if (missingPIs.length === 0) {
    console.log('✅ Nada a sincronizar! Todos os pagamentos já estão no DB.');
    return;
  }

  // 4. Para cada PI faltante, buscar dados e inserir
  console.log('\n🔧 SINCRONIZANDO...\n');
  let synced = 0;
  let failed = 0;

  for (const pi of missingPIs) {
    try {
      // Buscar dados do customer
      let userId: string | null = null;
      let customerId: string | null = null;
      let userEmail: string | null = null;

      if (pi.customer) {
        const stripeCustomerId = typeof pi.customer === 'string' ? pi.customer : pi.customer.id;
        
        // Buscar customer no DB
        const { data: customer } = await supabase
          .from('customers')
          .select('id, user_id, email')
          .eq('stripe_customer_id', stripeCustomerId)
          .single();

        if (customer) {
          customerId = customer.id;
          userId = customer.user_id;
          userEmail = customer.email;
        } else {
          // Tentar buscar customer no Stripe e verificar por email
          try {
            const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
            if (!stripeCustomer.deleted && stripeCustomer.email) {
              // Buscar usuário por email
              const { data: userByEmail } = await supabase
                .from('users')
                .select('id')
                .ilike('email', stripeCustomer.email)
                .single();

              if (userByEmail) {
                userId = userByEmail.id;
                userEmail = stripeCustomer.email;
              }
            }
          } catch (e) {
            // Customer deletado ou não encontrado
          }
        }
      }

      // Se não encontrou user, tentar pelo metadata
      if (!userId && pi.metadata?.clerk_id) {
        const { data: userByClerk } = await supabase
          .from('users')
          .select('id, email')
          .eq('clerk_id', pi.metadata.clerk_id)
          .single();

        if (userByClerk) {
          userId = userByClerk.id;
          userEmail = userByClerk.email;
        }
      }

      if (!userId) {
        console.log(`   ⚠️ ${pi.id} - User não encontrado, pulando...`);
        failed++;
        continue;
      }

      // Determinar plano
      let planType = pi.metadata?.plan || getPlanFromAmount(pi.amount);

      // Buscar subscription se existir
      let subscriptionId: string | null = null;
      if (pi.invoice) {
        try {
          const invoice = await stripe.invoices.retrieve(pi.invoice as string);
          if (invoice.subscription) {
            subscriptionId = typeof invoice.subscription === 'string' 
              ? invoice.subscription 
              : invoice.subscription.id;
          }
        } catch (e) {
          // Invoice não encontrada
        }
      }

      // Inserir pagamento
      const { error: insertError } = await supabase.from('payments').insert({
        user_id: userId,
        customer_id: customerId,
        stripe_payment_id: pi.id,
        stripe_payment_intent_id: pi.id,
        stripe_subscription_id: subscriptionId,
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        status: 'succeeded',
        payment_method: pi.payment_method_types?.[0] || 'card',
        description: `Pagamento sincronizado do Stripe (${planType})`,
        plan_type: planType,
        metadata: {
          synced_at: new Date().toISOString(),
          original_created: new Date(pi.created * 1000).toISOString(),
          sync_reason: 'missing_from_db'
        },
        created_at: new Date(pi.created * 1000).toISOString()
      });

      if (insertError) {
        console.log(`   ❌ ${pi.id} - Erro: ${insertError.message}`);
        failed++;
      } else {
        console.log(`   ✅ ${pi.id} - R$ ${(pi.amount/100).toFixed(2)} - ${userEmail || userId}`);
        synced++;
      }

    } catch (err: any) {
      console.log(`   ❌ ${pi.id} - Erro: ${err.message}`);
      failed++;
    }
  }

  // 5. Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO DA SINCRONIZAÇÃO');
  console.log('='.repeat(80));
  console.log(`   Total faltantes: ${missingPIs.length}`);
  console.log(`   ✅ Sincronizados: ${synced}`);
  console.log(`   ❌ Falhas: ${failed}`);
  
  const totalSynced = missingPIs
    .filter(pi => existingPIIds.has(pi.id) === false)
    .slice(0, synced)
    .reduce((acc, pi) => acc + pi.amount / 100, 0);
  
  console.log(`   💰 Valor sincronizado: R$ ${totalSynced.toFixed(2)}`);
}

// Confirmação antes de executar
console.log('⚠️  ATENÇÃO: Este script irá INSERIR pagamentos no banco de dados.');
console.log('   Certifique-se de ter executado compare-stripe-db.ts primeiro.');
console.log('   Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n');

setTimeout(() => {
  syncMissingPayments().catch(console.error);
}, 5000);
