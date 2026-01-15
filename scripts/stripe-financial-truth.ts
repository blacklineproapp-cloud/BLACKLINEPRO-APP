
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

async function getFinancialTruth() {
  console.log('🔍 ANALISANDO "BALANCE TRANSACTIONS" (FONTE DA VERDADE FINANCEIRA)');
  console.log('='.repeat(80));
  
  let transactions: Stripe.BalanceTransaction[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  console.log('⏳ Baixando histórico completo de transações...');

  while (hasMore) {
    const response = await stripe.balanceTransactions.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.source'], // Expandir a fonte para ver detalhes do charge
    });
    
    transactions = [...transactions, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  console.log(`✅ Total de transações financeiras encontradas: ${transactions.length}\n`);

  // Agrupar por tipo
  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;
  let countPayments = 0;
  
  const paymentMethods: Record<string, { count: number, volume: number }> = {};
  
  // Detalhar pagamentos
  const payments: any[] = [];

  for (const txn of transactions) {
     if (txn.type === 'charge' || txn.type === 'payment') {
         // É uma entrada de dinheiro
         totalGross += txn.amount;
         totalFees += txn.fee;
         totalNet += txn.net;
         countPayments++;

         // Tentar identificar o método
         let method = 'unknown';
         let email = 'unknown';
         
         const source = txn.source as any;
         if (source) {
             if (source.payment_method_details) {
                 method = source.payment_method_details.type;
             }
             if (source.billing_details?.email) email = source.billing_details.email;
             else if (source.receipt_email) email = source.receipt_email;
             else if (source.customer_details?.email) email = source.customer_details.email;
         }

         if (!paymentMethods[method]) paymentMethods[method] = { count: 0, volume: 0 };
         paymentMethods[method].count++;
         paymentMethods[method].volume += txn.amount;

         payments.push({
             date: new Date(txn.created * 1000).toLocaleString('pt-BR'),
             amount: txn.amount / 100,
             type: method,
             status: txn.status,
             email: email,
             desc: txn.description
         });
     }
  }

  console.log('='.repeat(80));
  console.log('📊 BALANÇO GERAL DO STRIPE (Balance Transactions)');
  console.log('='.repeat(80));
  console.log(`💰 Volume Bruto (Gross):  R$ ${(totalGross / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`💸 Taxas Stripe:         R$ ${(totalFees / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`💵 Volume Líquido (Net): R$ ${(totalNet / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🔢 Total de Pagamentos:  ${countPayments}`);
  console.log('='.repeat(80));
  
  console.log('\n💳 POR MÉTODO DE PAGAMENTO:');
  Object.entries(paymentMethods).forEach(([method, data]) => {
      console.log(`   🔸 ${method.toUpperCase().padEnd(10)}: ${data.count.toString().padEnd(3)} transações | R$ ${(data.volume / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  });

  // Tentar encontrar os "R$ 4900"
  // Verificar se há algum "Available Balance" ou "Pending Balance" que não entrou no histórico (raro)
  const balance = await stripe.balance.retrieve();
  
  console.log('\n\n🏦 SALDO ATUAL NA CONTA STRIPE:');
  console.log(`   Disponível: R$ ${(balance.available[0].amount / 100).toFixed(2)}`);
  console.log(`   Pendente:   R$ ${(balance.pending[0].amount / 100).toFixed(2)}`);

  // Vamos ver se existem transações "não capturadas" ou "autorizadas mas não pagas"?
  // Isso requer olhar PaymentIntents que não são Charges ainda.
  
  console.log('\n\n🔍 INVESTIGANDO PAYMENT INTENTS NÃO CONCLUÍDOS (POTENCIAL RECEITA?)');
  console.log('   (Buscando últimos 100 PIs não succeeded)');
  
  const pis = await stripe.paymentIntents.list({ limit: 100 });
  const pendingPis = pis.data.filter(pi => pi.status !== 'succeeded' && pi.status !== 'canceled');
  
  let potentialRevenue = 0;
  pendingPis.forEach(pi => {
      potentialRevenue += (pi.amount / 100);
      let email = 'unknown';
      if(pi.receipt_email) email = pi.receipt_email;
      // @ts-ignore
      else if(pi.customer && pi.customer.email) email = pi.customer.email;

      console.log(`   - [${pi.status.toUpperCase()}] R$ ${(pi.amount/100).toFixed(2)} (${new Date(pi.created*1000).toLocaleDateString()}) - ${email || 'No Email'}`);
  });
  
  console.log(`\n💰 Receita Potencial (Pendente): R$ ${potentialRevenue.toFixed(2)}`);
  console.log(`\n🏁 SOMA TOTAL (Gross + Potencial): R$ ${((totalGross/100) + potentialRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('='.repeat(80));

}

getFinancialTruth().catch(console.error);
