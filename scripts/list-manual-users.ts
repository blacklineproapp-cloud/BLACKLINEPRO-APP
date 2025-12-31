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

async function listManualUsers() {
  console.log('🔍 Buscando usuários no banco de dados...');

  // Buscar todos os usuários que são "is_paid"
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_paid', true);

  if (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    return;
  }

  // Filtrar aqueles que NÃO têm stripe_customer_id
  const manualUsers = users.filter(user => {
    const hasStripeId = user.stripe_customer_id && user.stripe_customer_id.trim().length > 0;
    // Se is_paid = true E não tem stripe ID, foi manual
    return !hasStripeId;
  });

  console.log(`\n📋 Relatório de Usuários Liberados Manualmente (Sem Stripe)\n`);
  console.log(`Total encontrado: ${manualUsers.length}\n`);

  if (manualUsers.length === 0) {
    console.log('Nenhum usuário encontrado com esses critérios.');
  } else {
    console.log('Nome | Email | Plano | Data Criação');
    console.log('-'.repeat(60));
    
    manualUsers.forEach(user => {
      const date = new Date(user.created_at).toLocaleDateString('pt-BR');
      console.log(`${user.name} | ${user.email} | ${user.plan} | ${date}`);
    });
  }
}

listManualUsers();
