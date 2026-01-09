import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10'
});

interface SyncResult {
  success: boolean;
  chargeId: string;
  userId?: string;
  email?: string;
  amount: number;
  error?: string;
}

async function syncMissingPayments() {
  console.log('\n🔄 SINCRONIZANDO PAGAMENTOS FALTANTES DO STRIPE');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar todos os charges bem-sucedidos do Stripe
  console.log('📥 Buscando charges do Stripe...');
  let allCharges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });
    
    allCharges = [...allCharges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const successfulCharges = allCharges.filter(c => c.status === 'succeeded' && c.paid);
  console.log(`✅ ${successfulCharges.length} charges bem-sucedidos encontrados no Stripe\n`);

  // 2. Buscar pagamentos já registrados no banco
  console.log('📊 Verificando pagamentos no banco...');
  const { data: dbPayments } = await supabase
    .from('payments')
    .select('stripe_payment_id');

  const dbPaymentIds = new Set(dbPayments?.map(p => p.stripe_payment_id) || []);
  console.log(`✅ ${dbPaymentIds.size} pagamentos já registrados no banco\n`);

  // 3. Identificar charges faltantes
  const missingCharges = successfulCharges.filter(c => !dbPaymentIds.has(c.id));
  console.log(`🔍 ${missingCharges.length} pagamentos faltando no banco\n`);

  if (missingCharges.length === 0) {
    console.log('✅ Todos os pagamentos já estão sincronizados!\n');
    return;
  }

  // 4. Sincronizar cada charge faltante
  console.log('='.repeat(80));
  console.log('🔄 INICIANDO SINCRONIZAÇÃO');
  console.log('='.repeat(80) + '\n');

  const results: SyncResult[] = [];

  for (const charge of missingCharges) {
    const result: SyncResult = {
      success: false,
      chargeId: charge.id,
      amount: charge.amount / 100
    };

    try {
      // Buscar customer no Stripe
      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
      
      if (!customerId) {
        result.error = 'Sem customer ID';
        results.push(result);
        console.log(`❌ ${charge.id} - Sem customer ID`);
        continue;
      }

      // Buscar customer no banco
      const { data: customer } = await supabase
        .from('customers')
        .select('id, user_id, email')
        .eq('stripe_customer_id', customerId)
        .single();

      if (!customer) {
        result.error = 'Customer não encontrado no banco';
        results.push(result);
        console.log(`⚠️  ${charge.id} - Customer ${customerId} não encontrado no banco`);
        continue;
      }

      result.userId = customer.user_id;
      result.email = customer.email;

      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('users')
        .select('plan, subscription_id')
        .eq('id', customer.user_id)
        .single();

      // Determinar método de pagamento
      let paymentMethod = 'other';
      if (charge.payment_method_details?.card) {
        paymentMethod = 'card';
      } else if (charge.payment_method_details?.boleto) {
        paymentMethod = 'boleto';
      } else if (charge.payment_method_details?.type) {
        paymentMethod = charge.payment_method_details.type;
      }

      // Determinar plano do pagamento
      let planType = user?.plan || 'starter';
      
      // Se tem metadata no charge, usar
      if (charge.metadata?.plan) {
        planType = charge.metadata.plan;
      }

      // Inserir pagamento no banco
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          user_id: customer.user_id,
          customer_id: customer.id,
          stripe_payment_id: charge.id,
          stripe_payment_intent_id: charge.payment_intent as string || charge.id,
          stripe_subscription_id: user?.subscription_id || null,
          amount: charge.amount / 100,
          currency: charge.currency.toUpperCase(),
          status: 'succeeded',
          payment_method: paymentMethod,
          description: `Sincronizado do Stripe - ${paymentMethod === 'boleto' ? 'Boleto' : 'Cartão'}`,
          plan_type: planType,
          receipt_url: charge.receipt_url || undefined
        });

      if (insertError) {
        result.error = insertError.message;
        results.push(result);
        console.log(`❌ ${charge.id} - Erro ao inserir: ${insertError.message}`);
        continue;
      }

      // Atualizar usuário se não estiver marcado como pago
      if (user && !user.subscription_id) {
        await supabase
          .from('users')
          .update({
            is_paid: true,
            plan: planType === 'free' ? 'starter' : planType,
            subscription_status: 'active'
          })
          .eq('id', customer.user_id);
      }

      result.success = true;
      results.push(result);
      
      const icon = paymentMethod === 'boleto' ? '📄' : '💳';
      console.log(`✅ ${icon} ${charge.id} - R$ ${(charge.amount / 100).toFixed(2)} - ${customer.email} - ${paymentMethod.toUpperCase()}`);

    } catch (error: any) {
      result.error = error.message;
      results.push(result);
      console.log(`❌ ${charge.id} - Erro: ${error.message}`);
    }
  }

  // 5. Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO DA SINCRONIZAÇÃO');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Sincronizados com sucesso: ${successful.length}`);
  console.log(`❌ Falharam: ${failed.length}`);

  if (successful.length > 0) {
    const totalSynced = successful.reduce((sum, r) => sum + r.amount, 0);
    console.log(`💰 Total sincronizado: R$ ${totalSynced.toFixed(2)}`);
  }

  if (failed.length > 0) {
    console.log(`\n⚠️  FALHAS:`);
    failed.forEach(f => {
      console.log(`   - ${f.chargeId}: ${f.error}`);
    });
  }

  console.log('\n✅ Sincronização concluída!\n');
}

syncMissingPayments().catch(console.error);
