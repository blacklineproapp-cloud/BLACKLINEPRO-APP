import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente faltando!');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type PlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'enterprise';

interface BoletoPayment {
  chargeId: string;
  email: string;
  nome: string;
  valor: number;
  data: Date;
  customerId: string;
  subscriptionId?: string;
  priceId?: string;
}

async function activateBoletoUsers() {
  console.log('🚀 ATIVAÇÃO AUTOMÁTICA DE USUÁRIOS QUE PAGARAM VIA BOLETO');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar todos os charges de boleto bem-sucedidos
  console.log('📥 Buscando pagamentos de boleto no Stripe...\n');
  
  let charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer', 'data.invoice'],
    });
    
    charges = [...charges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  // Filtrar apenas boletos bem-sucedidos
  const boletoCharges = charges.filter(c => 
    c.status === 'succeeded' && 
    c.paid && 
    c.payment_method_details?.boleto
  );

  console.log(`✅ Encontrados ${boletoCharges.length} pagamentos de boleto\n`);

  if (boletoCharges.length === 0) {
    console.log('⚠️  Nenhum pagamento de boleto encontrado!');
    return;
  }

  const boletoPayments: BoletoPayment[] = [];

  // 2. Processar cada boleto
  for (const charge of boletoCharges) {
    let email = charge.billing_details?.email || charge.receipt_email || '';
    let nome = charge.billing_details?.name || '';
    
    if (!email && charge.customer) {
      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer.id;
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.deleted) {
          email = customer.email || '';
          nome = nome || customer.name || '';
        }
      } catch (e) {
        console.error(`❌ Erro ao buscar customer ${customerId}`);
      }
    }

    let subscriptionId: string | undefined;
    let priceId: string | undefined;

    // Buscar subscription e price do invoice
    if (charge.invoice) {
      const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : charge.invoice.id;
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['subscription'] });
        subscriptionId = invoice.subscription ? (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id) : undefined;
        
        // Pegar o price_id da primeira linha do invoice
        if (invoice.lines.data.length > 0) {
          priceId = invoice.lines.data[0].price?.id;
        }
      } catch (e) {
        console.error(`❌ Erro ao buscar invoice ${invoiceId}`);
      }
    }

    if (email !== 'NÃO IDENTIFICADO') {
      boletoPayments.push({
        chargeId: charge.id,
        email,
        nome: nome || 'N/A',
        valor: charge.amount / 100,
        data: new Date(charge.created * 1000),
        customerId: typeof charge.customer === 'string' ? charge.customer : (charge.customer?.id || 'N/A'),
        subscriptionId,
        priceId,
      });
    }
  }

  console.log(`📋 Processando ${boletoPayments.length} boletos com email identificado\n`);

  // 3. Para cada boleto, verificar e ativar usuário
  let activated = 0;
  let alreadyActive = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < boletoPayments.length; i++) {
    const payment = boletoPayments[i];
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`📋 Processando ${i + 1}/${boletoPayments.length}: ${payment.email}`);
    console.log(`${'-'.repeat(80)}`);

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, plan, is_paid, subscription_status, stripe_customer_id')
      .eq('email', payment.email)
      .single();

    if (userError || !user) {
      console.log(`❌ Usuário não encontrado no banco: ${payment.email}`);
      notFound++;
      continue;
    }

    console.log(`👤 Usuário encontrado: ${user.name} (${user.plan})`);
    console.log(`   is_paid: ${user.is_paid} | subscription_status: ${user.subscription_status || 'null'}`);

    // Verificar se já está ativo
    if (user.is_paid && user.plan !== 'free' && user.plan !== 'legacy') {
      console.log(`✅ Usuário já está ativo - pulando`);
      alreadyActive++;
      continue;
    }

    // Determinar o plano baseado no price_id ou valor
    let planType: PlanType = 'monthly'; // default
    
    if (payment.priceId) {
      // Buscar o price no Stripe para determinar o plano
      try {
        const price = await stripe.prices.retrieve(payment.priceId);
        const interval = price.recurring?.interval;
        const intervalCount = price.recurring?.interval_count || 1;

        if (interval === 'month') {
          if (intervalCount === 1) planType = 'monthly';
          else if (intervalCount === 3) planType = 'quarterly';
          else if (intervalCount === 6) planType = 'semiannual';
        } else if (interval === 'year') {
          planType = 'annual';
        }
      } catch (e) {
        console.log(`⚠️  Não foi possível determinar o plano do price ${payment.priceId}, usando monthly`);
      }
    } else {
      // Determinar pelo valor (fallback)
      if (payment.valor >= 500) planType = 'annual';
      else if (payment.valor >= 300) planType = 'semiannual';
      else if (payment.valor >= 150) planType = 'quarterly';
      else planType = 'monthly';
    }

    console.log(`🎯 Plano detectado: ${planType} (R$ ${payment.valor.toFixed(2)})`);

    // Ativar usuário usando a função atômica
    console.log(`🔄 Ativando usuário...`);

    try {
      const { data: result, error: activationError } = await supabase.rpc('activate_user_with_reset', {
        p_user_id: user.id,
        p_plan: planType,
        p_subscription_id: payment.subscriptionId || null,
        p_stripe_customer_id: payment.customerId,
      });

      if (activationError) {
        console.error(`❌ Erro ao ativar usuário:`, activationError);
        errors++;
        continue;
      }

      console.log(`✅ USUÁRIO ATIVADO COM SUCESSO!`);
      console.log(`   Plano: ${planType}`);
      console.log(`   Subscription ID: ${payment.subscriptionId || 'N/A'}`);
      console.log(`   Limites resetados: ✅`);
      activated++;

      // Registrar pagamento na tabela payments se não existir
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('stripe_charge_id', payment.chargeId)
        .single();

      if (!existingPayment) {
        console.log(`💾 Registrando pagamento na tabela payments...`);
        
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            stripe_charge_id: payment.chargeId,
            stripe_customer_id: payment.customerId,
            amount: payment.valor,
            currency: 'brl',
            status: 'succeeded',
            payment_method: 'boleto',
            created_at: payment.data.toISOString(),
          });

        if (paymentError) {
          console.error(`⚠️  Erro ao registrar pagamento:`, paymentError);
        } else {
          console.log(`✅ Pagamento registrado`);
        }
      } else {
        console.log(`ℹ️  Pagamento já estava registrado`);
      }

    } catch (e) {
      console.error(`❌ Erro ao processar usuário:`, e);
      errors++;
    }
  }

  // 4. Resumo final
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 RESUMO DA ATIVAÇÃO');
  console.log('='.repeat(80));
  console.log(`\n✅ Usuários ativados: ${activated}`);
  console.log(`ℹ️  Já estavam ativos: ${alreadyActive}`);
  console.log(`⚠️  Não encontrados: ${notFound}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`\n📈 Total processado: ${boletoPayments.length}`);

  if (activated > 0) {
    console.log(`\n\n🎉 ${activated} usuário(s) foram liberados com sucesso!`);
    console.log(`\n💡 Próximos passos:`);
    console.log(`   1. Verificar se os usuários conseguem acessar o app`);
    console.log(`   2. Fazer deploy do fix para liberar boletos futuros automaticamente`);
    console.log(`   3. Rodar a migration SQL: supabase/migrations/009_atomic_plan_activation.sql`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Processo concluído!\n');
}

activateBoletoUsers().catch(console.error);
