/**
 * Script de Teste - Envio de Email de Cortesia
 *
 * Envia email de link de pagamento para um email específico de teste
 *
 * Uso: npx tsx scripts/test-courtesy-email.ts
 */

// Carregar variáveis de ambiente ANTES de tudo
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const TEST_EMAIL = 'erickrussomat@gmail.com';

async function testCourtesyEmail() {
  // Imports dinâmicos depois do dotenv carregar
  const { getPriceIdFromPlan } = await import('../lib/billing/stripe-plan-mapping');
  const { CheckoutService } = await import('../lib/stripe/checkout-service');
  const { sendCourtesyPaymentEmail } = await import('../lib/email');
  const { supabaseAdmin } = await import('../lib/supabase');
  console.log('\n🧪 TESTE DE EMAIL DE CORTESIA\n');
  console.log('📧 Email de teste:', TEST_EMAIL);

  try {
    // 1. Buscar usuário no banco
    console.log('\n1️⃣ Buscando usuário no banco...');
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, name, plan, is_paid, subscription_id')
      .eq('email', TEST_EMAIL);

    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.error('❌ Usuário não encontrado com email:', TEST_EMAIL);
      console.log('\n💡 Dica: Verifique se o email está correto no banco de dados');
      return;
    }

    if (users.length > 1) {
      console.warn('⚠️  Múltiplos usuários encontrados:', users.length);
      console.log('   Usando o primeiro...');
    }

    const user = users[0];

    console.log('✅ Usuário encontrado:');
    console.log('   Nome:', user.name || 'N/A');
    console.log('   Email:', user.email);
    console.log('   Plano:', user.plan);
    console.log('   Is Paid:', user.is_paid);
    console.log('   Subscription ID:', user.subscription_id || 'NULL (cortesia)');

    // Validar se é usuário de cortesia
    if (!user.is_paid || user.subscription_id) {
      console.error('❌ Este usuário não é de cortesia!');
      console.error('   - is_paid deve ser true');
      console.error('   - subscription_id deve ser null');
      return;
    }

    // 2. Obter Price ID do Stripe
    console.log('\n2️⃣ Obtendo Price ID do Stripe...');
    if (!['ink', 'pro', 'studio'].includes(user.plan)) {
      console.error('❌ Plano inválido:', user.plan);
      return;
    }

    const priceId = getPriceIdFromPlan(
      user.plan as 'ink' | 'pro' | 'studio',
      'monthly'
    );
    console.log('✅ Price ID:', priceId);

    // 3. Criar checkout session no Stripe
    console.log('\n3️⃣ Criando checkout session no Stripe...');
    const checkout = await CheckoutService.createAdminCheckoutSession({
      userEmail: user.email,
      userName: user.name || user.email,
      priceId,
      planType: user.plan as 'ink' | 'pro' | 'studio',
      adminId: user.id, // Usando próprio ID como admin (teste)
      clerkId: user.clerk_id
    });

    if (!checkout.url) {
      console.error('❌ Stripe não retornou URL do checkout');
      return;
    }

    console.log('✅ Checkout criado:');
    console.log('   Session ID:', checkout.sessionId);
    console.log('   URL:', checkout.url);

    // 4. Enviar email
    console.log('\n4️⃣ Enviando email...');
    console.log('   FROM_EMAIL:', process.env.FROM_EMAIL);
    console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 10)}...` : 'NÃO CONFIGURADA');

    const emailResult = await sendCourtesyPaymentEmail(
      user.email,
      user.name || user.email,
      user.plan,
      checkout.url
    );

    console.log('\n📧 Resultado do envio:', JSON.stringify(emailResult, null, 2));

    if (!emailResult.success) {
      console.error('❌ Erro ao enviar email:', emailResult.error);
      return;
    }

    console.log('✅ Email enviado com sucesso!');

    // 5. Registrar no banco (opcional - comentado para não poluir em testes)
    console.log('\n5️⃣ Registrando envio no banco...');
    const { error: insertError } = await supabaseAdmin
      .from('remarketing_campaigns')
      .insert({
        user_id: user.id,
        campaign_type: 'courtesy',
        email_status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (insertError) {
      console.warn('⚠️  Aviso ao registrar:', insertError.message);
    } else {
      console.log('✅ Envio registrado no banco');
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📬 Verifique sua caixa de entrada em:', TEST_EMAIL);
    console.log('🔗 Link de pagamento:', checkout.url);
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error);
  }
}

// Executar teste
testCourtesyEmail();
