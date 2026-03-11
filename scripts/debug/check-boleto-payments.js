/**
 * Script para verificar pagamentos via boleto no Stripe
 * Data: 2026-01-09
 */

const dotenv = require('dotenv');
const path = require('path');

// Carregar .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkBoletoPayments() {
  console.log('🔍 Buscando pagamentos via boleto no Stripe...\n');

  try {
    // Buscar faturas pagas via boleto nos últimos 90 dias (expandido para encontrar todos os casos)
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);

    const invoices = await stripe.invoices.list({
      limit: 100,
      status: 'paid',
      created: {
        gte: ninetyDaysAgo
      }
    });

    console.log(`📊 Total de faturas pagas nos últimos 90 dias: ${invoices.data.length}\n`);

    const allPayments = [];
    const noChargeInvoices = [];

    for (const invoice of invoices.data) {
      // Buscar charge associada
      if (invoice.charge) {
        const charge = await stripe.charges.retrieve(invoice.charge);

        allPayments.push({
          invoice_id: invoice.id,
          customer: invoice.customer,
          customer_email: invoice.customer_email,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
          subscription: invoice.subscription,
          payment_method: charge.payment_method_details?.type || 'unknown',
          has_charge: true
        });
      } else {
        // Invoices sem charge (geralmente $0 ou trial)
        noChargeInvoices.push({
          invoice_id: invoice.id,
          customer: invoice.customer,
          customer_email: invoice.customer_email,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          paid_at: invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : 'N/A',
          subscription: invoice.subscription,
          payment_method: 'no_charge',
          has_charge: false
        });
      }
    }

    // Agrupar por método de pagamento
    const paymentsByMethod = allPayments.reduce((acc, p) => {
      if (!acc[p.payment_method]) {
        acc[p.payment_method] = [];
      }
      acc[p.payment_method].push(p);
      return acc;
    }, {});

    console.log('💳 TODOS OS PAGAMENTOS POR MÉTODO:');
    console.log('='.repeat(100));

    Object.entries(paymentsByMethod).forEach(([method, payments]) => {
      console.log(`\n🔹 ${method.toUpperCase()} (${payments.length} pagamentos):`);
      payments.forEach((p, idx) => {
        console.log(`\n   ${idx + 1}. ${p.customer_email || 'Email não disponível'}`);
        console.log(`      Invoice ID: ${p.invoice_id}`);
        console.log(`      Valor: ${p.currency.toUpperCase()} ${p.amount}`);
        console.log(`      Pago em: ${p.paid_at}`);
        console.log(`      Subscription ID: ${p.subscription || 'N/A'}`);
      });
    });

    const boletoPayments = allPayments.filter(p => p.payment_method === 'boleto');

    // Mostrar invoices sem charge
    if (noChargeInvoices.length > 0) {
      console.log('\n\n📋 FATURAS SEM CHARGE (Trial/Grátis):');
      console.log('='.repeat(100));
      noChargeInvoices.forEach((inv, idx) => {
        console.log(`\n${idx + 1}. ${inv.customer_email || 'Email não disponível'}`);
        console.log(`   Invoice ID: ${inv.invoice_id}`);
        console.log(`   Valor: ${inv.currency.toUpperCase()} ${inv.amount}`);
        console.log(`   Pago em: ${inv.paid_at}`);
        console.log(`   Subscription ID: ${inv.subscription || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(100));
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total de invoices: ${invoices.data.length}`);
    console.log(`   Invoices com charge: ${allPayments.length}`);
    console.log(`   Invoices sem charge: ${noChargeInvoices.length}`);
    console.log(`   Pagamentos via boleto: ${boletoPayments.length}`);
    if (Object.keys(paymentsByMethod).length > 0) {
      Object.entries(paymentsByMethod).forEach(([method, payments]) => {
        console.log(`   ${method}: ${payments.length}`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao buscar pagamentos:', error.message);
  }
}

checkBoletoPayments();
