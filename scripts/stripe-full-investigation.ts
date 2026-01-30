/**
 * Investigação COMPLETA do Stripe
 * Busca TUDO: customers, payments, checkout sessions, invoices
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

async function main() {
  console.log('🔍 INVESTIGAÇÃO COMPLETA DO STRIPE\n');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // ==========================================
  // 1. CUSTOMERS
  // ==========================================
  console.log('👥 CUSTOMERS');
  console.log('─────────────────────────────────────────────────────────────────────');

  let allCustomers: Stripe.Customer[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });
    allCustomers.push(...response.data.filter(c => !c.deleted));
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  console.log(`  Total de customers: ${allCustomers.length}`);
  console.log('');

  // ==========================================
  // 2. SUBSCRIPTIONS (todos os status)
  // ==========================================
  console.log('📦 SUBSCRIPTIONS (todos os status)');
  console.log('─────────────────────────────────────────────────────────────────────');

  const subscriptionsByStatus: Record<string, number> = {};
  let allSubs: Stripe.Subscription[] = [];
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const response = await stripe.subscriptions.list({
      limit: 100,
      starting_after: startingAfter,
      status: 'all',
    });
    allSubs.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  allSubs.forEach(sub => {
    subscriptionsByStatus[sub.status] = (subscriptionsByStatus[sub.status] || 0) + 1;
  });

  console.log(`  Total de subscriptions: ${allSubs.length}`);
  Object.entries(subscriptionsByStatus).forEach(([status, count]) => {
    console.log(`    • ${status}: ${count}`);
  });
  console.log('');

  // ==========================================
  // 3. CHECKOUT SESSIONS (últimos 90 dias)
  // ==========================================
  console.log('🛒 CHECKOUT SESSIONS (últimos 90 dias)');
  console.log('─────────────────────────────────────────────────────────────────────');

  const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
  let allCheckouts: Stripe.Checkout.Session[] = [];
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const response = await stripe.checkout.sessions.list({
      limit: 100,
      starting_after: startingAfter,
      created: { gte: ninetyDaysAgo },
    });
    allCheckouts.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const checkoutsByStatus: Record<string, number> = {};
  const checkoutsByPaymentStatus: Record<string, number> = {};
  let totalCheckoutRevenue = 0;
  const paidCheckouts: any[] = [];

  allCheckouts.forEach(checkout => {
    checkoutsByStatus[checkout.status || 'unknown'] = (checkoutsByStatus[checkout.status || 'unknown'] || 0) + 1;
    checkoutsByPaymentStatus[checkout.payment_status] = (checkoutsByPaymentStatus[checkout.payment_status] || 0) + 1;

    if (checkout.payment_status === 'paid' && checkout.amount_total) {
      totalCheckoutRevenue += checkout.amount_total / 100;
      paidCheckouts.push({
        email: checkout.customer_email || checkout.customer_details?.email || 'N/A',
        amount: checkout.amount_total / 100,
        date: new Date(checkout.created * 1000).toISOString().split('T')[0],
        mode: checkout.mode,
        paymentMethod: checkout.payment_method_types?.join(', ') || 'unknown',
      });
    }
  });

  console.log(`  Total de checkout sessions: ${allCheckouts.length}`);
  console.log('  Por status:');
  Object.entries(checkoutsByStatus).forEach(([status, count]) => {
    console.log(`    • ${status}: ${count}`);
  });
  console.log('  Por payment_status:');
  Object.entries(checkoutsByPaymentStatus).forEach(([status, count]) => {
    console.log(`    • ${status}: ${count}`);
  });
  console.log(`  💰 Receita total (checkouts pagos): R$ ${totalCheckoutRevenue.toFixed(2)}`);
  console.log('');

  // ==========================================
  // 4. PAYMENT INTENTS (últimos 90 dias)
  // ==========================================
  console.log('💳 PAYMENT INTENTS (últimos 90 dias)');
  console.log('─────────────────────────────────────────────────────────────────────');

  let allPayments: Stripe.PaymentIntent[] = [];
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const response = await stripe.paymentIntents.list({
      limit: 100,
      starting_after: startingAfter,
      created: { gte: ninetyDaysAgo },
    });
    allPayments.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const paymentsByStatus: Record<string, number> = {};
  let totalPaymentRevenue = 0;
  const succeededPayments: any[] = [];

  allPayments.forEach(payment => {
    paymentsByStatus[payment.status] = (paymentsByStatus[payment.status] || 0) + 1;

    if (payment.status === 'succeeded') {
      totalPaymentRevenue += payment.amount / 100;
      succeededPayments.push({
        id: payment.id,
        amount: payment.amount / 100,
        date: new Date(payment.created * 1000).toISOString().split('T')[0],
        paymentMethod: payment.payment_method_types?.join(', ') || 'unknown',
      });
    }
  });

  console.log(`  Total de payment intents: ${allPayments.length}`);
  console.log('  Por status:');
  Object.entries(paymentsByStatus).forEach(([status, count]) => {
    console.log(`    • ${status}: ${count}`);
  });
  console.log(`  💰 Receita total (succeeded): R$ ${totalPaymentRevenue.toFixed(2)}`);
  console.log('');

  // ==========================================
  // 5. INVOICES (últimos 90 dias)
  // ==========================================
  console.log('📄 INVOICES (últimos 90 dias)');
  console.log('─────────────────────────────────────────────────────────────────────');

  let allInvoices: Stripe.Invoice[] = [];
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const response = await stripe.invoices.list({
      limit: 100,
      starting_after: startingAfter,
      created: { gte: ninetyDaysAgo },
    });
    allInvoices.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const invoicesByStatus: Record<string, number> = {};
  let totalInvoiceRevenue = 0;

  allInvoices.forEach(invoice => {
    invoicesByStatus[invoice.status || 'unknown'] = (invoicesByStatus[invoice.status || 'unknown'] || 0) + 1;

    if (invoice.status === 'paid') {
      totalInvoiceRevenue += (invoice.amount_paid || 0) / 100;
    }
  });

  console.log(`  Total de invoices: ${allInvoices.length}`);
  console.log('  Por status:');
  Object.entries(invoicesByStatus).forEach(([status, count]) => {
    console.log(`    • ${status}: ${count}`);
  });
  console.log(`  💰 Receita total (paid): R$ ${totalInvoiceRevenue.toFixed(2)}`);
  console.log('');

  // ==========================================
  // 6. CHARGES (últimos 90 dias) - mais detalhado
  // ==========================================
  console.log('💵 CHARGES (últimos 90 dias)');
  console.log('─────────────────────────────────────────────────────────────────────');

  let allCharges: Stripe.Charge[] = [];
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      created: { gte: ninetyDaysAgo },
    });
    allCharges.push(...response.data);
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const chargesByStatus: Record<string, number> = {};
  const chargesByPaymentMethod: Record<string, number> = {};
  let totalChargeRevenue = 0;
  const succeededCharges: any[] = [];

  allCharges.forEach(charge => {
    chargesByStatus[charge.status] = (chargesByStatus[charge.status] || 0) + 1;

    if (charge.status === 'succeeded') {
      totalChargeRevenue += charge.amount / 100;

      const method = charge.payment_method_details?.type || 'unknown';
      chargesByPaymentMethod[method] = (chargesByPaymentMethod[method] || 0) + 1;

      succeededCharges.push({
        id: charge.id,
        amount: charge.amount / 100,
        date: new Date(charge.created * 1000).toISOString().split('T')[0],
        email: charge.billing_details?.email || charge.receipt_email || 'N/A',
        paymentMethod: method,
        description: charge.description || 'N/A',
      });
    }
  });

  console.log(`  Total de charges: ${allCharges.length}`);
  console.log('  Por status:');
  Object.entries(chargesByStatus).forEach(([status, count]) => {
    console.log(`    • ${status}: ${count}`);
  });
  console.log('  Succeeded por método de pagamento:');
  Object.entries(chargesByPaymentMethod).forEach(([method, count]) => {
    console.log(`    • ${method}: ${count}`);
  });
  console.log(`  💰 Receita total (succeeded): R$ ${totalChargeRevenue.toFixed(2)}`);
  console.log('');

  // ==========================================
  // RESUMO FINAL
  // ==========================================
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('                         📊 RESUMO FINAL                               ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`  👥 Total de Customers:              ${allCustomers.length}`);
  console.log(`  📦 Total de Subscriptions:          ${allSubs.length}`);
  console.log(`     └─ Ativas:                       ${subscriptionsByStatus['active'] || 0}`);
  console.log(`  🛒 Checkout Sessions (90d):         ${allCheckouts.length}`);
  console.log(`     └─ Pagos:                        ${checkoutsByPaymentStatus['paid'] || 0}`);
  console.log(`  💳 Payment Intents (90d):           ${allPayments.length}`);
  console.log(`     └─ Succeeded:                    ${paymentsByStatus['succeeded'] || 0}`);
  console.log(`  💵 Charges (90d):                   ${allCharges.length}`);
  console.log(`     └─ Succeeded:                    ${chargesByStatus['succeeded'] || 0}`);
  console.log('');
  console.log(`  💰 RECEITA TOTAL (90 dias):         R$ ${totalChargeRevenue.toFixed(2)}`);
  console.log('');

  // Lista de pagamentos recentes
  if (succeededCharges.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('            💳 ÚLTIMOS PAGAMENTOS BEM-SUCEDIDOS                        ');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    console.log('Data        Valor       Email                                    Método');
    console.log('─────────────────────────────────────────────────────────────────────────');

    succeededCharges
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50)
      .forEach(c => {
        const date = c.date;
        const amount = `R$ ${c.amount.toFixed(2)}`.padStart(10);
        const email = (c.email || 'N/A').substring(0, 40).padEnd(40);
        const method = c.paymentMethod;
        console.log(`${date}  ${amount}  ${email} ${method}`);
      });

    if (succeededCharges.length > 50) {
      console.log(`\n... e mais ${succeededCharges.length - 50} pagamentos`);
    }
  }

  // Salvar dados
  const fs = await import('fs');
  const report = {
    generatedAt: new Date().toISOString(),
    customers: allCustomers.length,
    subscriptions: {
      total: allSubs.length,
      byStatus: subscriptionsByStatus,
    },
    checkoutSessions: {
      total: allCheckouts.length,
      byStatus: checkoutsByStatus,
      byPaymentStatus: checkoutsByPaymentStatus,
      revenue: totalCheckoutRevenue,
    },
    paymentIntents: {
      total: allPayments.length,
      byStatus: paymentsByStatus,
      revenue: totalPaymentRevenue,
    },
    charges: {
      total: allCharges.length,
      byStatus: chargesByStatus,
      byPaymentMethod: chargesByPaymentMethod,
      revenue: totalChargeRevenue,
    },
    recentCharges: succeededCharges.slice(0, 100),
  };

  fs.writeFileSync('./scripts/stripe-full-investigation.json', JSON.stringify(report, null, 2));
  console.log('\n\n💾 Dados completos salvos em: ./scripts/stripe-full-investigation.json');
}

main().catch(console.error);
