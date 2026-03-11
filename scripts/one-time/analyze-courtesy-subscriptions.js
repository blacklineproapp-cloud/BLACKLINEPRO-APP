/**
 * Análise Completa de Subscriptions dos Usuários com Cortesia
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe').default;
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10'
});

async function analyzeCourtesySubscriptions() {
  console.log('🔍 ANÁLISE DE SUBSCRIPTIONS DOS USUÁRIOS COM CORTESIA');
  console.log('='.repeat(80));

  // 1. Buscar usuários com cortesia que têm subscription_id
  const { data: users } = await supabase
    .from('users')
    .select('id, email, plan, subscription_id, is_paid')
    .eq('admin_courtesy', true)
    .not('subscription_id', 'is', null);

  console.log(`\nTotal de usuários com cortesia + subscription_id: ${users.length}\n`);

  const statusCount = {
    active: [],
    past_due: [],
    incomplete_expired: [],
    canceled: [],
    incomplete: [],
    trialing: [],
    unpaid: [],
    not_found: [],
    error: []
  };

  // 2. Verificar cada subscription no Stripe
  for (const user of users) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.subscription_id);
      const renewDate = new Date(sub.current_period_end * 1000).toLocaleDateString('pt-BR');
      
      const entry = {
        email: user.email,
        plan: user.plan,
        subscriptionId: user.subscription_id,
        renewDate: renewDate,
        stripeStatus: sub.status
      };

      if (statusCount[sub.status]) {
        statusCount[sub.status].push(entry);
      } else {
        statusCount.error.push({ ...entry, note: 'Status desconhecido: ' + sub.status });
      }
    } catch (e) {
      statusCount.not_found.push({
        email: user.email,
        plan: user.plan,
        subscriptionId: user.subscription_id,
        error: e.message
      });
    }
  }

  // 3. Mostrar resumo
  console.log('📊 RESUMO POR STATUS NO STRIPE:\n');
  
  Object.entries(statusCount).forEach(([status, users]) => {
    if (users.length > 0) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📌 ${status.toUpperCase()}: ${users.length} usuários`);
      console.log('='.repeat(60));
      
      users.forEach(u => {
        console.log(`   ${u.email} | ${u.plan} | Renova: ${u.renewDate || 'N/A'}`);
      });
    }
  });

  // 4. Análise de ação necessária
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 ANÁLISE DE AÇÃO NECESSÁRIA');
  console.log('='.repeat(80));

  const needNewCheckout = statusCount.incomplete_expired.length + statusCount.canceled.length + statusCount.not_found.length;
  const willAutoRenew = statusCount.active.length;
  const needAttention = statusCount.past_due.length + statusCount.unpaid.length;

  console.log(`
✅ Vão renovar automaticamente:    ${willAutoRenew} usuários
⚠️  Precisam de atenção (past_due): ${needAttention} usuários  
❌ Precisam de novo checkout:       ${needNewCheckout} usuários

EXPLICAÇÃO:
- incomplete_expired: Boleto gerado mas nunca foi pago. Subscription expirou.
- past_due: Stripe tentou cobrar mas falhou. Vai tentar novamente.
- canceled: Subscription foi cancelada.
- active: Tudo ok, vai renovar automaticamente.
`);

  // 5. Salvar relatório
  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total: users.length,
      active: statusCount.active.length,
      past_due: statusCount.past_due.length,
      incomplete_expired: statusCount.incomplete_expired.length,
      canceled: statusCount.canceled.length,
      not_found: statusCount.not_found.length
    },
    details: statusCount
  };

  require('fs').writeFileSync(
    'scripts/courtesy-subscriptions-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n📝 Relatório completo salvo em: scripts/courtesy-subscriptions-report.json');
}

analyzeCourtesySubscriptions().catch(console.error);
