import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserAudit {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_paid: boolean;
  tools_unlocked: boolean;
  subscription_status: string;
  subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  source: 'stripe' | 'admin_manual' | 'unknown';
}

async function auditAdminChangedUsers() {
  console.log('🔍 AUDITORIA COMPLETA DE USUÁRIOS BLACK LINE PRO\n');
  console.log('='.repeat(80));

  // 1. Buscar todos os usuários pagos
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ Erro ao buscar usuários:', usersError.message);
    return;
  }

  // 2. Buscar customers (Stripe)
  const { data: customers } = await supabase
    .from('customers')
    .select('user_id, stripe_customer_id');

  const customerMap = new Map<string, string>();
  customers?.forEach(c => customerMap.set(c.user_id, c.stripe_customer_id));

  // 3. Buscar subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('customer_id, stripe_subscription_id, status, metadata');

  // 4. Classificar usuários
  const adminUsers: UserAudit[] = [];
  const stripeUsers: UserAudit[] = [];
  const freeUsers: UserAudit[] = [];

  users.forEach(user => {
    const stripeCustomerId = customerMap.get(user.id) || null;
    const hasActiveSubscription = user.subscription_id && user.subscription_status === 'active';
    
    // Determinar fonte de ativação
    let source: 'stripe' | 'admin_manual' | 'unknown' = 'unknown';
    
    if (user.is_paid) {
      // Verificar se tem subscription ativa com metadata de manual_activation
      const sub = subscriptions?.find(s => 
        s.stripe_subscription_id === user.subscription_id
      );
      
      if (sub?.metadata?.manual_activation === 'true') {
        source = 'admin_manual';
      } else if (stripeCustomerId && hasActiveSubscription) {
        source = 'stripe';
      } else if (user.is_paid && !stripeCustomerId) {
        source = 'admin_manual';
      } else {
        source = 'stripe';
      }
    }

    const audit: UserAudit = {
      id: user.id,
      email: user.email,
      name: user.name || 'Sem Nome',
      plan: user.plan || 'free',
      is_paid: user.is_paid,
      tools_unlocked: user.tools_unlocked,
      subscription_status: user.subscription_status || 'inactive',
      subscription_id: user.subscription_id,
      stripe_customer_id: stripeCustomerId,
      created_at: user.created_at,
      updated_at: user.updated_at,
      source
    };

    if (!user.is_paid) {
      freeUsers.push(audit);
    } else if (source === 'admin_manual') {
      adminUsers.push(audit);
    } else {
      stripeUsers.push(audit);
    }
  });

  // 5. Exibir Relatório
  console.log('\n📊 RESUMO GERAL');
  console.log('-'.repeat(40));
  console.log(`👥 Total de usuários: ${users.length}`);
  console.log(`💰 Pagantes via Stripe: ${stripeUsers.length}`);
  console.log(`🔧 Ativados pelo Admin: ${adminUsers.length}`);
  console.log(`🆓 Free (não pagantes): ${freeUsers.length}`);

  // 6. Lista de usuários ativados pelo Admin
  console.log('\n\n🔧 USUÁRIOS ATIVADOS PELO ADMIN (Manuais)');
  console.log('='.repeat(80));
  
  if (adminUsers.length === 0) {
    console.log('Nenhum usuário ativado manualmente.');
  } else {
    console.log(`${'Email'.padEnd(35)} | ${'Plano'.padEnd(8)} | ${'Status'.padEnd(10)} | ${'Data'.padEnd(12)} | Sub ID`);
    console.log('-'.repeat(100));
    
    adminUsers.forEach(u => {
      const date = new Date(u.created_at).toLocaleDateString('pt-BR');
      console.log(
        `${u.email.substring(0, 33).padEnd(35)} | ` +
        `${u.plan.padEnd(8)} | ` +
        `${u.subscription_status.padEnd(10)} | ` +
        `${date.padEnd(12)} | ` +
        `${u.subscription_id?.substring(0, 20) || 'N/A'}`
      );
    });
  }

  // 7. Lista de usuários pagos via Stripe
  console.log('\n\n💳 USUÁRIOS PAGANTES VIA STRIPE');
  console.log('='.repeat(80));
  
  if (stripeUsers.length === 0) {
    console.log('Nenhum usuário pagante via Stripe.');
  } else {
    console.log(`${'Email'.padEnd(35)} | ${'Plano'.padEnd(8)} | ${'Status'.padEnd(10)} | Stripe Customer ID`);
    console.log('-'.repeat(90));
    
    stripeUsers.forEach(u => {
      console.log(
        `${u.email.substring(0, 33).padEnd(35)} | ` +
        `${u.plan.padEnd(8)} | ` +
        `${u.subscription_status.padEnd(10)} | ` +
        `${u.stripe_customer_id || 'N/A'}`
      );
    });
  }

  // 8. Estatísticas por plano
  console.log('\n\n📈 ESTATÍSTICAS POR PLANO');
  console.log('='.repeat(40));
  
  const planCounts = users.reduce((acc: Record<string, number>, u) => {
    const plan = u.plan || 'free';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  Object.entries(planCounts).forEach(([plan, count]) => {
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`${plan.padEnd(10)}: ${count.toString().padStart(4)} ${bar}`);
  });

  console.log('\n✅ Auditoria concluída!');
}

auditAdminChangedUsers();
