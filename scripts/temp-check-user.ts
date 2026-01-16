import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUser() {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', 'jrtattoo83@gmail.com')
    .single();

  if (error) {
    console.log('Erro:', error.message);
    return;
  }

  console.log('=== USUARIO ===');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Nome:', user.name);
  console.log('Plano:', user.plan);
  console.log('is_paid:', user.is_paid);
  console.log('tools_unlocked:', user.tools_unlocked);
  console.log('subscription_status:', user.subscription_status);
  console.log('subscription_id:', user.subscription_id);
  console.log('is_blocked:', user.is_blocked);
  console.log('blocked_reason:', user.blocked_reason);
  console.log('admin_courtesy:', user.admin_courtesy);
  console.log('admin_courtesy_expires_at:', user.admin_courtesy_expires_at);

  // Uso
  const firstDay = new Date();
  firstDay.setDate(1);
  firstDay.setHours(0,0,0,0);
  
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', firstDay.toISOString());

  console.log('\n=== USO NO MES ===');
  console.log('Registros:', usage ? usage.length : 0);

  // Limites por plano
  const limits: Record<string, number> = {
    free: 3,
    starter: 95,
    pro: 210,
    studio: 680,
    enterprise: 1400
  };
  const limit = limits[user.plan] || 3;
  console.log('Limite do plano:', limit);
  console.log('Restante:', limit - (usage?.length || 0));

  // Customer
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('\n=== CUSTOMER ===');
  if (customer) {
    console.log('ID:', customer.id);
    console.log('Stripe ID:', customer.stripe_customer_id);
  } else {
    console.log('Nao encontrado');
  }

  // Payments
  const { data: payments } = await supabase
    .from('payments')
    .select('status, amount, payment_method, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n=== PAGAMENTOS ===');
  if (payments && payments.length > 0) {
    payments.forEach((p: any) => {
      console.log(p.status, '- R$', p.amount, '-', p.payment_method, '-', p.created_at);
    });
  } else {
    console.log('Nenhum');
  }
}

checkUser();
