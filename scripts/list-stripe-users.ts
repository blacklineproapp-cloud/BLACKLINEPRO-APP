import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listStripeUsers() {
  console.log('🔍 Buscando usuários pagantes via Stripe...');

  // Buscar todos os usuários que são "is_paid"
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_paid', true);

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    return;
  }

  // Filtrar aqueles que TÊM stripe_customer_id
  const stripeUsers = users.filter(user => {
    return user.stripe_customer_id && user.stripe_customer_id.trim().length > 0;
  });

  console.log(`\n💳 Relatório de Usuários Stripe (Pagamento Automático)\n`);
  console.log(`Total encontrado: ${stripeUsers.length}\n`);

  if (stripeUsers.length === 0) {
    console.log('Nenhum usuário Stripe encontrado.');
  } else {
    // Cabeçalho alinhado
    console.log(`${'Nome'.padEnd(25)} | ${'Email'.padEnd(30)} | ${'Plano'.padEnd(10)} | ${'Stripe ID'.padEnd(20)}`);
    console.log('-'.repeat(95));
    
    stripeUsers.forEach(user => {
      const name = (user.name || 'Sem Nome').substring(0, 25).padEnd(25);
      const email = user.email.substring(0, 30).padEnd(30);
      const plan = (user.plan || 'free').padEnd(10);
      const stripeId = user.stripe_customer_id.padEnd(20);
      
      console.log(`${name} | ${email} | ${plan} | ${stripeId}`);
    });
  }
}

listStripeUsers();
