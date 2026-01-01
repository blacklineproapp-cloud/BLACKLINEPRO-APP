import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY não configurada');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });

interface PaymentDetail {
  email: string;
  nome: string;
  valor: number;
  data: string;
  cartao: string;
  chargeId: string;
  customerId: string;
}

async function getCompletePaymentReport() {
  console.log('🔍 RELATÓRIO COMPLETO DE PAGAMENTOS - COM EMAILS');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  // 1. Buscar todos os charges com customer expandido
  console.log('📥 Buscando pagamentos e customers...\n');
  
  let charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });
    
    charges = [...charges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const successfulCharges = charges.filter(c => c.status === 'succeeded' && c.paid);

  const payments: PaymentDetail[] = [];

  for (const charge of successfulCharges) {
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
        // Customer não encontrado
      }
    }

    // Método de pagamento
    let cartao = 'N/A';
    if (charge.payment_method_details?.card) {
      const card = charge.payment_method_details.card;
      cartao = `${card.brand?.toUpperCase()} **** ${card.last4}`;
    } else if (charge.payment_method_details?.boleto) {
      cartao = 'BOLETO';
    } else if (charge.payment_method_details?.type) {
      cartao = charge.payment_method_details.type.toUpperCase();
    }

    payments.push({
      email: email || 'NÃO IDENTIFICADO',
      nome: nome || 'N/A',
      valor: charge.amount / 100,
      data: new Date(charge.created * 1000).toLocaleString('pt-BR'),
      cartao,
      chargeId: charge.id,
      customerId: typeof charge.customer === 'string' ? charge.customer : (charge.customer?.id || 'N/A'),
    });
  }

  // Ordenar por data (mais recente primeiro)
  payments.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Calcular totais
  const totalReceived = payments.reduce((sum, p) => sum + p.valor, 0);

  console.log('='.repeat(80));
  console.log('💰 RESUMO FINANCEIRO');
  console.log('='.repeat(80));
  console.log(`💳 Total recebido: R$ ${totalReceived.toFixed(2)}`);
  console.log(`📊 Número de pagamentos: ${payments.length}`);

  // Lista detalhada
  console.log('\n\n' + '='.repeat(100));
  console.log('📋 LISTA DETALHADA DE PAGAMENTOS');
  console.log('='.repeat(100));
  console.log(`${'Data'.padEnd(20)} | ${'Email'.padEnd(35)} | ${'Valor'.padStart(10)} | Cartão`);
  console.log('-'.repeat(100));

  for (const p of payments) {
    const dataShort = p.data.split(',')[0]; // Só a data, sem hora
    console.log(
      `${dataShort.padEnd(20)} | ${p.email.substring(0, 33).padEnd(35)} | R$ ${p.valor.toFixed(2).padStart(7)} | ${p.cartao}`
    );
  }

  // Agrupar por email
  console.log('\n\n' + '='.repeat(80));
  console.log('👥 RESUMO POR CLIENTE');
  console.log('='.repeat(80));

  const byEmail: Record<string, { total: number; count: number; lastDate: string; customerId: string }> = {};
  
  payments.forEach(p => {
    if (!byEmail[p.email]) {
      byEmail[p.email] = { total: 0, count: 0, lastDate: '', customerId: p.customerId };
    }
    byEmail[p.email].total += p.valor;
    byEmail[p.email].count++;
    byEmail[p.email].lastDate = p.data.split(',')[0];
  });

  const sortedClients = Object.entries(byEmail).sort((a, b) => b[1].total - a[1].total);

  console.log(`${'Email'.padEnd(40)} | ${'Total'.padStart(10)} | Pagtos | Customer ID`);
  console.log('-'.repeat(100));

  sortedClients.forEach(([email, data]) => {
    console.log(
      `${email.substring(0, 38).padEnd(40)} | R$ ${data.total.toFixed(2).padStart(7)} | ${data.count.toString().padStart(6)} | ${data.customerId}`
    );
  });

  // Identificar clientes sem email
  const noEmail = payments.filter(p => p.email === 'NÃO IDENTIFICADO');
  if (noEmail.length > 0) {
    console.log('\n\n⚠️  ATENÇÃO: ' + noEmail.length + ' pagamentos sem email identificado!');
    console.log('Customer IDs para investigar:');
    
    const uniqueCustomers = [...new Set(noEmail.map(p => p.customerId))];
    uniqueCustomers.forEach(cid => {
      console.log(`   - ${cid}`);
    });
  }

  console.log('\n✅ Relatório concluído!');
}

getCompletePaymentReport().catch(console.error);
