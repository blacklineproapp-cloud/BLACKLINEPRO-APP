import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe, PRICES, PlanType } from '@/lib/stripe';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

type CheckoutPlan = 'editor_only' | 'full_access';

// Versão que retorna objeto (para JSON response)
async function handleCheckoutWithResult(req: Request, plan: CheckoutPlan): Promise<{ url: string } | { redirect: URL }> {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (!userId || !clerkUser) {
    return { redirect: new URL('/', req.url) };
  }

  const user = await getOrCreateUser(userId);
  if (!user) {
    return { redirect: new URL('/dashboard?error=user_not_found', req.url) };
  }

  // Verificar se Stripe está configurado
  const isStripeConfigured =
    PRICES.EDITOR_ONLY &&
    PRICES.FULL_ACCESS &&
    PRICES.EDITOR_ONLY.startsWith('price_') &&
    PRICES.EDITOR_ONLY.length > 20 &&
    !PRICES.EDITOR_ONLY.includes('xxx');

  // Em desenvolvimento, ativar direto sem Stripe
  if (!isStripeConfigured && process.env.NODE_ENV !== 'production') {
    const updates: any = {
      is_paid: true,
      subscription_status: 'active',
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      plan: plan,
    };

    // Full access inclui tools
    if (plan === 'full_access') {
      updates.tools_unlocked = true;
    }

    await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('clerk_id', userId);

    return { redirect: new URL(`/dashboard?plan=${plan}&activated=true`, req.url) };
  }

  if (!isStripeConfigured) {
    return { redirect: new URL('/dashboard?error=stripe_not_configured', req.url) };
  }

  // Definir price ID baseado no plano
  const priceId = plan === 'editor_only' ? PRICES.EDITOR_ONLY : PRICES.FULL_ACCESS;

  // Criar sessão de checkout do Stripe
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'boleto'],
    line_items: [
      { price: priceId, quantity: 1 },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    client_reference_id: userId,
    customer_email: clerkUser.emailAddresses[0]?.emailAddress,
    metadata: {
      clerk_id: userId,
      plan: plan,
      user_id: user.id,
    },
    subscription_data: {
      metadata: {
        clerk_id: userId,
        plan: plan,
        user_id: user.id,
      },
    },
  });

  return { url: session.url! };
}

// Versão legacy que retorna NextResponse (para navegação direta)
async function handleCheckout(req: Request, plan: CheckoutPlan) {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (!userId || !clerkUser) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const user = await getOrCreateUser(userId);
  if (!user) {
    return NextResponse.redirect(new URL('/dashboard?error=user_not_found', req.url));
  }

  // Verificar se Stripe está configurado
  const isStripeConfigured =
    PRICES.EDITOR_ONLY &&
    PRICES.FULL_ACCESS &&
    PRICES.EDITOR_ONLY.startsWith('price_') &&
    PRICES.EDITOR_ONLY.length > 20 &&
    !PRICES.EDITOR_ONLY.includes('xxx');

  // Em desenvolvimento, ativar direto sem Stripe
  if (!isStripeConfigured && process.env.NODE_ENV !== 'production') {
    const updates: any = {
      is_paid: true,
      subscription_status: 'active',
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      plan: plan,
    };

    // Full access inclui tools
    if (plan === 'full_access') {
      updates.tools_unlocked = true;
    }

    await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('clerk_id', userId);

    return NextResponse.redirect(new URL(`/dashboard?plan=${plan}&activated=true`, req.url));
  }

  if (!isStripeConfigured) {
    return NextResponse.redirect(new URL('/dashboard?error=stripe_not_configured', req.url));
  }

  // Definir price ID baseado no plano
  const priceId = plan === 'editor_only' ? PRICES.EDITOR_ONLY : PRICES.FULL_ACCESS;

  // Criar sessão de checkout do Stripe
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'boleto'],
    line_items: [
      { price: priceId, quantity: 1 },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    client_reference_id: userId,
    customer_email: clerkUser.emailAddresses[0]?.emailAddress,
    metadata: {
      clerk_id: userId,
      plan: plan,
      user_id: user.id,
    },
    subscription_data: {
      metadata: {
        clerk_id: userId,
        plan: plan,
        user_id: user.id,
      },
    },
  });

  return NextResponse.redirect(session.url!);
}

// GET - Suporta redirect via URL (window.location.href) OU JSON via fetch
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const plan = url.searchParams.get('plan') as CheckoutPlan || 'editor_only';

    // Validar plano
    if (plan !== 'editor_only' && plan !== 'full_access') {
      // Se é fetch (Accept: application/json), retornar JSON
      const acceptHeader = req.headers.get('accept') || '';
      if (acceptHeader.includes('application/json')) {
        return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
      }
      return NextResponse.redirect(new URL('/pricing?error=invalid_plan', req.url));
    }

    const result = await handleCheckoutWithResult(req, plan);

    // Se é fetch (Accept: application/json), retornar JSON
    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      if ('redirect' in result) {
        return NextResponse.json({ url: result.redirect.toString() });
      }
      return NextResponse.json(result);
    }

    // Se é navegação direta do navegador, fazer redirect
    if ('redirect' in result) {
      return NextResponse.redirect(result.redirect);
    }
    return NextResponse.redirect(result.url);
  } catch (error: any) {
    console.error('Erro ao criar checkout:', error);

    // Se é fetch, retornar JSON
    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      return NextResponse.json({ error: 'Erro ao criar checkout: ' + error.message }, { status: 500 });
    }

    return NextResponse.redirect(new URL('/pricing?error=checkout_failed', req.url));
  }
}

// POST - Suporta form e JSON
export async function POST(req: Request) {
  try {
    let plan: CheckoutPlan = 'editor_only';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      plan = body.plan || 'editor_only';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      plan = (formData.get('plan')?.toString() as CheckoutPlan) || 'editor_only';
    }

    // Validar plano
    if (plan !== 'editor_only' && plan !== 'full_access') {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    return await handleCheckout(req, plan);
  } catch (error: any) {
    console.error('Erro ao criar checkout:', error);
    return NextResponse.json(
      { error: 'Erro ao criar checkout: ' + error.message },
      { status: 500 }
    );
  }
}

