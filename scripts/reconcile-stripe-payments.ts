
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });

async function main() {
  console.log('🔍 Iniciando reconciliação entre Stripe e Banco de Dados...\n');

  // 1. Buscar TODAS as cobranças de sucesso do Stripe
  console.log('📦 Buscando todas as cobranças do Stripe (pode demorar)...');
  let stripeCharges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });

    stripeCharges = [...stripeCharges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
    process.stdout.write(`.`);
  }
  console.log('\n');

  const successfulCharges = stripeCharges.filter(c => c.status === 'succeeded' && c.paid);
  console.log(`✅ Total de cobranças de sucesso no Stripe: ${successfulCharges.length}`);

  // 2. Agrupar por Email
  const chargesByEmail = new Map<string, number>();
  const emailToChargeIds = new Map<string, string[]>();

  for (const charge of successfulCharges) {
    let email = charge.billing_details?.email || charge.receipt_email || '';
    
    // Tentar pegar do customer se não tiver na charge
    if (!email && charge.customer) {
        // Se customer veio expandido (objeto)
        if (typeof charge.customer !== 'string' && !charge.customer.deleted && charge.customer.email) {
            email = charge.customer.email;
        } 
        // Se veio string, não vamos buscar um por um para não demorar, assumimos vazio ou logamos
    }

    if (email) {
      email = email.toLowerCase().trim();
      chargesByEmail.set(email, (chargesByEmail.get(email) || 0) + 1);
      
      const ids = emailToChargeIds.get(email) || [];
      ids.push(charge.id);
      emailToChargeIds.set(email, ids);
    }
  }

  const uniquePayersStripe = chargesByEmail.size;
  console.log(`👥 Total de PAGANTES ÚNICOS no Stripe: ${uniquePayersStripe}`);
  console.log(`📉 Diferença (Transações - Pagantes): ${successfulCharges.length - uniquePayersStripe}`);

  console.log('\n================================================================');
  console.log('🔁 USUÁRIOS COM MÚLTIPLOS PAGAMENTOS (Renovações/Tentativas)');
  console.log('================================================================');
  
  let multiPaymentCount = 0;
  for (const [email, count] of chargesByEmail.entries()) {
    if (count > 1) {
      console.log(`🔹 ${email}: ${count} pagamentos`);
      multiPaymentCount++;
    }
  }

  if (multiPaymentCount === 0) {
      console.log('Nenhum usuário com múltiplos pagamentos encontrado.');
  }

  // 3. Comparar com Admin Users (is_paid = true)
  console.log('\n================================================================');
  console.log('🆚 COMPARAÇÃO COM BANCO DE DADOS');
  console.log('================================================================');

  const { data: dbPaidUsers } = await supabase
    .from('users')
    .select('email')
    .eq('is_paid', true);
  
  const dbPaidEmails = new Set(dbPaidUsers?.map(u => u.email.toLowerCase().trim()) || []);
  console.log(`📊 Usuários com is_paid=true no Banco: ${dbPaidEmails.size}`);

  // Quem tá no Stripe mas não no Banco como pago?
  console.log('\n⚠️  NO STRIPE (PAGOU) MAS NÃO NO BANCO (COMO PAGO):');
  for (const email of chargesByEmail.keys()) {
      if (!dbPaidEmails.has(email)) {
          console.log(`❌ ${email} (Tem ${chargesByEmail.get(email)} pagamentos no Stripe)`);
      }
  }

  // Quem tá no Banco como pago mas não achamos no Stripe?
  console.log('\n⚠️  NO BANCO (COMO PAGO) MAS NÃO NO STRIPE (CACHE LOCAL):');
  for (const email of dbPaidEmails) {
      if (!chargesByEmail.has(email)) {
          // Filtrar admins/testes conhecidos se quiser
          console.log(`❓ ${email} (Provável Cortesia ou Boleto Manual sem Charge Linkada corretamente)`);
      }
  }

  console.log('\n✅ Conclusão da Análise:');
  console.log(`Total Transações Stripe: ${successfulCharges.length}`);
  console.log(`Pagantes Únicos Stripe: ${uniquePayersStripe}`);
  
  if (successfulCharges.length > uniquePayersStripe) {
       console.log(`💡 A diferença de ${successfulCharges.length - uniquePayersStripe} deve-se a usuários que pagaram mais de uma vez (renovações).`);
  } else {
       console.log(`💡 Não houve renovações detectadas.`);
  }
}

main();
