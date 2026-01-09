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

interface BoletoPayment {
  chargeId: string;
  email: string;
  nome: string;
  valor: number;
  data: Date;
  customerId: string;
  invoiceId?: string;
  subscriptionId?: string;
}

interface UserStatus {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_paid: boolean;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  tools_unlocked: boolean;
  admin_courtesy: boolean;
  grace_period_until: string | null;
}

async function auditBoletosPayments() {
  console.log('🔍 AUDITORIA DE PAGAMENTOS VIA BOLETO');
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

  console.log(`✅ Encontrados ${boletoCharges.length} pagamentos de boleto bem-sucedidos\n`);

  if (boletoCharges.length === 0) {
    console.log('⚠️  Nenhum pagamento de boleto encontrado!');
    return;
  }

  const boletoPayments: BoletoPayment[] = [];

  // 2. Processar cada boleto
  for (const charge of boletoCharges) {
    let email = charge.billing_details?.email || charge.receipt_email || '';
    let nome = charge.billing_details?.name || '';
    
    // Se não tem email, buscar do customer
    if (!email && charge.customer) {
      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer.id;
      
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.deleted) {
          email = customer.email || '';
          nome = nome || customer.name || '';
        }
      } catch (e) {
        console.error(`❌ Erro ao buscar customer ${customerId}:`, e);
      }
    }

    const invoiceId = charge.invoice ? (typeof charge.invoice === 'string' ? charge.invoice : charge.invoice.id) : undefined;
    let subscriptionId: string | undefined;

    // Buscar subscription do invoice
    if (invoiceId) {
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        subscriptionId = invoice.subscription ? (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id) : undefined;
      } catch (e) {
        console.error(`❌ Erro ao buscar invoice ${invoiceId}:`, e);
      }
    }

    boletoPayments.push({
      chargeId: charge.id,
      email: email || 'NÃO IDENTIFICADO',
      nome: nome || 'N/A',
      valor: charge.amount / 100,
      data: new Date(charge.created * 1000),
      customerId: typeof charge.customer === 'string' ? charge.customer : (charge.customer?.id || 'N/A'),
      invoiceId,
      subscriptionId,
    });
  }

  // Ordenar por data (mais antigo primeiro)
  boletoPayments.sort((a, b) => a.data.getTime() - b.data.getTime());

  console.log('='.repeat(80));
  console.log('💰 PAGAMENTOS DE BOLETO ENCONTRADOS');
  console.log('='.repeat(80));
  console.log(`Total: ${boletoPayments.length} pagamentos | Valor total: R$ ${boletoPayments.reduce((sum, p) => sum + p.valor, 0).toFixed(2)}\n`);

  // 3. Para cada boleto, verificar status do usuário no banco
  const usersToActivate: Array<{ payment: BoletoPayment; user: UserStatus | null; needsActivation: boolean }> = [];

  for (let i = 0; i < boletoPayments.length; i++) {
    const payment = boletoPayments[i];
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`📋 BOLETO #${i + 1} de ${boletoPayments.length}`);
    console.log(`${'-'.repeat(80)}`);
    console.log(`💳 Charge ID: ${payment.chargeId}`);
    console.log(`📧 Email: ${payment.email}`);
    console.log(`👤 Nome: ${payment.nome}`);
    console.log(`💰 Valor: R$ ${payment.valor.toFixed(2)}`);
    console.log(`📅 Data: ${payment.data.toLocaleString('pt-BR')}`);
    console.log(`🆔 Customer ID: ${payment.customerId}`);
    if (payment.invoiceId) console.log(`📄 Invoice ID: ${payment.invoiceId}`);
    if (payment.subscriptionId) console.log(`🔄 Subscription ID: ${payment.subscriptionId}`);

    // Buscar usuário no banco
    let user: UserStatus | null = null;
    let needsActivation = false;

    if (payment.email !== 'NÃO IDENTIFICADO') {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, name, plan, is_paid, subscription_status, stripe_customer_id, tools_unlocked, admin_courtesy, grace_period_until')
        .eq('email', payment.email)
        .single();

      if (error) {
        console.log(`\n⚠️  USUÁRIO NÃO ENCONTRADO NO BANCO DE DADOS`);
        console.log(`   Possível causa: Email diferente no Stripe vs Supabase`);
      } else {
        user = userData as UserStatus;
        console.log(`\n👤 STATUS DO USUÁRIO NO BANCO:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Plano: ${user.plan}`);
        console.log(`   is_paid: ${user.is_paid}`);
        console.log(`   subscription_status: ${user.subscription_status || 'null'}`);
        console.log(`   stripe_customer_id: ${user.stripe_customer_id || 'null'}`);
        console.log(`   tools_unlocked: ${user.tools_unlocked}`);
        console.log(`   admin_courtesy: ${user.admin_courtesy}`);
        console.log(`   grace_period_until: ${user.grace_period_until || 'null'}`);

        // Verificar se precisa ativar
        if (!user.is_paid || user.plan === 'free' || user.plan === 'legacy') {
          needsActivation = true;
          console.log(`\n🚨 PRECISA SER LIBERADO!`);
          console.log(`   Motivo: Pagamento confirmado mas usuário não está ativo`);
        } else {
          console.log(`\n✅ USUÁRIO JÁ ESTÁ LIBERADO`);
        }
      }
    } else {
      console.log(`\n⚠️  EMAIL NÃO IDENTIFICADO - Impossível verificar usuário`);
    }

    usersToActivate.push({ payment, user, needsActivation });
  }

  // 4. Resumo final
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 RESUMO DA AUDITORIA');
  console.log('='.repeat(80));

  const totalPayments = boletoPayments.length;
  const usersFound = usersToActivate.filter(u => u.user !== null).length;
  const usersNeedActivation = usersToActivate.filter(u => u.needsActivation).length;
  const usersAlreadyActive = usersToActivate.filter(u => u.user && !u.needsActivation).length;
  const usersNotFound = usersToActivate.filter(u => u.user === null).length;

  console.log(`\n📈 Estatísticas:`);
  console.log(`   Total de boletos pagos: ${totalPayments}`);
  console.log(`   Usuários encontrados no banco: ${usersFound}`);
  console.log(`   Usuários já liberados: ${usersAlreadyActive}`);
  console.log(`   Usuários que PRECISAM ser liberados: ${usersNeedActivation}`);
  console.log(`   Usuários não encontrados: ${usersNotFound}`);

  if (usersNeedActivation > 0) {
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('🚨 USUÁRIOS QUE PRECISAM SER LIBERADOS');
    console.log('='.repeat(80));

    usersToActivate
      .filter(u => u.needsActivation)
      .forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.payment.email}`);
        console.log(`   Nome: ${item.payment.nome}`);
        console.log(`   Valor pago: R$ ${item.payment.valor.toFixed(2)}`);
        console.log(`   Data: ${item.payment.data.toLocaleString('pt-BR')}`);
        console.log(`   Plano atual: ${item.user?.plan || 'N/A'}`);
        console.log(`   is_paid: ${item.user?.is_paid || false}`);
        console.log(`   Subscription ID: ${item.payment.subscriptionId || 'N/A'}`);
      });

    console.log(`\n\n${'='.repeat(80)}`);
    console.log('💡 PRÓXIMOS PASSOS');
    console.log('='.repeat(80));
    console.log(`\n1. Execute o script de liberação automática:`);
    console.log(`   npm run script scripts/activate-boleto-users.ts`);
    console.log(`\n2. Ou libere manualmente cada usuário via admin panel`);
    console.log(`\n3. Após deploy do fix, novos boletos serão liberados automaticamente ✅`);
  } else {
    console.log(`\n\n✅ TODOS OS USUÁRIOS DE BOLETO JÁ ESTÃO LIBERADOS!`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Auditoria concluída!\n');
}

auditBoletosPayments().catch(console.error);
