
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCourtesyUsers() {
  console.log('--- DEBUG USUÁRIOS DE CORTESIA ---');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, plan, is_paid, subscription_id, admin_courtesy')
    .eq('is_paid', true)
    .is('subscription_id', null);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Total encontrados (is_paid=true, sub=null): ${users.length}`);
  
  users.forEach(u => {
    console.log(`- ${u.email}: Plano=${u.plan}, Courtesy=${u.admin_courtesy}`);
  });

  const plans = [...new Set(users.map(u => u.plan))];
  console.log('Planos encontrados:', plans);
}

debugCourtesyUsers();
