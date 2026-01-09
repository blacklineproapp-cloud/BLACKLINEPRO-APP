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

interface UserPaymentInfo {
  email: string;
  name: string | null;
  plan: string;
  isPaid: boolean;
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  stripeCustomerId: string | null;
  adminCourtesy: boolean;
  gracePeriodUntil: string | null;
  payments: {
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    description: string;
    createdAt: string;
    stripePaymentId: string | null;
  }[];
  stripeSubscription: any;
}

async function generateCompletePaymentReport() {
  console.log('\n💰 RELATÓRIO COMPLETO DE USUÁRIOS PAGANTES');
  console.log('='.repeat(100));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar todos os usuários com is_paid = true
  const { data: paidUsers, error: usersError } = await supabase
    .from('users')
    .select('id, email, name, plan, is_paid, subscription_status, subscription_id, admin_courtesy, grace_period_until, auto_bill_after_grace')
    .eq('is_paid', true)
    .order('email');

  if (usersError) {
    console.error('❌ Erro ao buscar usuários:', usersError.message);
    return;
  }

  console.log(`📊 Total de usuários pagantes: ${paidUsers?.length || 0}\n`);

  const userPaymentInfos: UserPaymentInfo[] = [];

  for (const user of paidUsers || []) {
    // Buscar pagamentos do usuário
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Buscar customer do Stripe
    const { data: customer } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    // Buscar subscription do Stripe se existir
    let stripeSubscription = null;
    if (user.subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(user.subscription_id);
      } catch (e) {
        // Subscription não encontrada
      }
    }

    userPaymentInfos.push({
      email: user.email,
      name: user.name,
      plan: user.plan,
      isPaid: user.is_paid,
      subscriptionStatus: user.subscription_status,
      subscriptionId: user.subscription_id,
      stripeCustomerId: customer?.stripe_customer_id || null,
      adminCourtesy: user.admin_courtesy || false,
      gracePeriodUntil: user.grace_period_until,
      payments: payments?.map(p => ({
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        paymentMethod: p.payment_method,
        description: p.description || '',
        createdAt: new Date(p.created_at).toLocaleString('pt-BR'),
        stripePaymentId: p.stripe_payment_id
      })) || [],
      stripeSubscription
    });
  }

  // ============================================================================
  // EXIBIR RELATÓRIO DETALHADO
  // ============================================================================

  console.log('='.repeat(100));
  console.log('👥 USUÁRIOS PAGANTES - DETALHAMENTO COMPLETO');
  console.log('='.repeat(100));

  for (const info of userPaymentInfos) {
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`📧 Email: ${info.email}`);
    console.log(`👤 Nome: ${info.name || 'N/A'}`);
    console.log(`📦 Plano: ${info.plan.toUpperCase()}`);
    console.log(`✅ Pago: ${info.isPaid ? 'SIM' : 'NÃO'}`);
    console.log(`📊 Status Subscription: ${info.subscriptionStatus || 'N/A'}`);
    console.log(`🔑 Subscription ID: ${info.subscriptionId || 'N/A'}`);
    console.log(`🏢 Stripe Customer ID: ${info.stripeCustomerId || 'N/A'}`);
    
    if (info.adminCourtesy) {
      console.log(`🎁 Cortesia Admin: SIM`);
    }
    
    if (info.gracePeriodUntil) {
      console.log(`⏰ Grace Period até: ${new Date(info.gracePeriodUntil).toLocaleString('pt-BR')}`);
    }

    // Informações da subscription do Stripe
    if (info.stripeSubscription) {
      console.log(`\n💳 SUBSCRIPTION STRIPE:`);
      console.log(`   Status: ${info.stripeSubscription.status}`);
      console.log(`   Período atual: ${new Date(info.stripeSubscription.current_period_start * 1000).toLocaleDateString('pt-BR')} - ${new Date(info.stripeSubscription.current_period_end * 1000).toLocaleDateString('pt-BR')}`);
      console.log(`   Cancelar no fim: ${info.stripeSubscription.cancel_at_period_end ? 'SIM' : 'NÃO'}`);
    }

    // Pagamentos
    if (info.payments.length > 0) {
      console.log(`\n💰 PAGAMENTOS (${info.payments.length}):`);
      
      const totalPago = info.payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const boletosCount = info.payments.filter(p => p.paymentMethod === 'boleto').length;
      const cartoesCount = info.payments.filter(p => p.paymentMethod === 'card').length;
      
      console.log(`   Total pago: R$ ${totalPago.toFixed(2)}`);
      console.log(`   Boletos: ${boletosCount} | Cartões: ${cartoesCount}`);
      
      console.log(`\n   Histórico:`);
      info.payments.forEach((payment, idx) => {
        const icon = payment.status === 'succeeded' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';
        const method = payment.paymentMethod === 'boleto' ? '📄 BOLETO' : '💳 CARTÃO';
        console.log(`   ${icon} ${idx + 1}. ${method} - R$ ${payment.amount.toFixed(2)} - ${payment.status.toUpperCase()} - ${payment.createdAt}`);
        if (payment.description) {
          console.log(`      ${payment.description}`);
        }
      });
    } else {
      console.log(`\n⚠️  NENHUM PAGAMENTO REGISTRADO NO BANCO`);
    }
  }

  // ============================================================================
  // RESUMO ESTATÍSTICO
  // ============================================================================

  console.log(`\n\n${'='.repeat(100)}`);
  console.log('📊 RESUMO ESTATÍSTICO');
  console.log('='.repeat(100));

  const totalUsuarios = userPaymentInfos.length;
  const comSubscription = userPaymentInfos.filter(u => u.subscriptionId).length;
  const semSubscription = userPaymentInfos.filter(u => !u.subscriptionId).length;
  const cortesiaAdmin = userPaymentInfos.filter(u => u.adminCourtesy).length;
  const gracePeriod = userPaymentInfos.filter(u => u.gracePeriodUntil).length;
  const comPagamentos = userPaymentInfos.filter(u => u.payments.length > 0).length;
  const semPagamentos = userPaymentInfos.filter(u => u.payments.length === 0).length;

  console.log(`\n👥 USUÁRIOS:`);
  console.log(`   Total: ${totalUsuarios}`);
  console.log(`   Com Subscription ID: ${comSubscription}`);
  console.log(`   Sem Subscription ID: ${semSubscription}`);
  console.log(`   Cortesia Admin: ${cortesiaAdmin}`);
  console.log(`   Grace Period: ${gracePeriod}`);

  console.log(`\n💰 PAGAMENTOS:`);
  console.log(`   Usuários com pagamentos: ${comPagamentos}`);
  console.log(`   Usuários sem pagamentos: ${semPagamentos}`);

  const allPayments = userPaymentInfos.flatMap(u => u.payments);
  const totalRecebido = allPayments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalBoletos = allPayments.filter(p => p.paymentMethod === 'boleto').length;
  const totalCartoes = allPayments.filter(p => p.paymentMethod === 'card').length;
  const totalPendentes = allPayments.filter(p => p.status === 'pending').length;

  console.log(`   Total recebido: R$ ${totalRecebido.toFixed(2)}`);
  console.log(`   Total de pagamentos: ${allPayments.length}`);
  console.log(`   Boletos: ${totalBoletos}`);
  console.log(`   Cartões: ${totalCartoes}`);
  console.log(`   Pendentes: ${totalPendentes}`);

  // ============================================================================
  // ALERTAS
  // ============================================================================

  console.log(`\n\n${'='.repeat(100)}`);
  console.log('⚠️  ALERTAS');
  console.log('='.repeat(100));

  const usuariosSemPagamento = userPaymentInfos.filter(u => 
    u.payments.length === 0 && !u.adminCourtesy && !u.gracePeriodUntil
  );

  if (usuariosSemPagamento.length > 0) {
    console.log(`\n❌ ${usuariosSemPagamento.length} usuários marcados como pagos mas SEM pagamentos registrados:`);
    usuariosSemPagamento.forEach(u => {
      console.log(`   - ${u.email} (${u.plan})`);
    });
  }

  const usuariosSemSubscription = userPaymentInfos.filter(u => 
    !u.subscriptionId && !u.adminCourtesy
  );

  if (usuariosSemSubscription.length > 0) {
    console.log(`\n⚠️  ${usuariosSemSubscription.length} usuários sem Subscription ID (exceto cortesia):`);
    usuariosSemSubscription.forEach(u => {
      console.log(`   - ${u.email} (${u.plan}) - ${u.payments.length} pagamento(s)`);
    });
  }

  console.log('\n✅ Relatório concluído!\n');
}

generateCompletePaymentReport().catch(console.error);
