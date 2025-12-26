import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

async function isAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('clerk_id', userId)
    .single();

  const userEmailLower = user?.email?.toLowerCase() || '';
  return user ? ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower) : false;
}

/**
 * POST - Gerar link para usuário adicionar método de pagamento
 *
 * Body: {
 *   userId: string,
 *   returnUrl?: string (opcional, URL para retornar após adicionar cartão)
 * }
 *
 * Retorna:
 * {
 *   url: "https://checkout.stripe.com/c/pay/cs_test_...",
 *   sessionId: "cs_test_..."
 * }
 *
 * Envie esse link para o usuário via email/whatsapp
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      userId: userIdToSetup,
      returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
    } = body;

    if (!userIdToSetup) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    console.log('[Setup Payment] Gerando link para:', userIdToSetup);

    // Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userIdToSetup)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar ou criar customer no Stripe
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userIdToSetup)
      .single();

    let stripeCustomerId: string;

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
      console.log('[Setup Payment] Customer já existe:', stripeCustomerId);
    } else {
      // Criar customer no Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          clerk_id: user.clerk_id,
          user_id: userIdToSetup
        }
      });

      stripeCustomerId = customer.id;

      // Salvar customer no banco
      await supabaseAdmin.from('customers').insert({
        user_id: userIdToSetup,
        stripe_customer_id: customer.id,
        email: user.email,
        nome: user.name
      });

      console.log('[Setup Payment] Customer criado:', customer.id);
    }

    // Criar Checkout Session em modo "setup"
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${returnUrl}?payment_setup=success`,
      cancel_url: `${returnUrl}?payment_setup=cancelled`,
      metadata: {
        user_id: userIdToSetup,
        clerk_id: user.clerk_id,
        setup_type: 'grace_period_preparation'
      }
    });

    console.log('[Setup Payment] ✅ Checkout Session criado:', session.id);

    // Salvar informação de que enviamos o link
    await supabaseAdmin
      .from('users')
      .update({
        metadata: {
          ...user.metadata,
          payment_setup_link_sent_at: new Date().toISOString(),
          payment_setup_session_id: session.id
        }
      })
      .eq('id', userIdToSetup);

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      message: 'Link gerado com sucesso. Envie para o usuário adicionar o cartão.',
      user: {
        email: user.email,
        name: user.name
      }
    });

  } catch (error: any) {
    console.error('[Setup Payment] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
