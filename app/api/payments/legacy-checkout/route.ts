import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

/**
 * POST /api/payments/legacy-checkout
 * Gera checkout session para plano Legacy (usuário autenticado)
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se usuário tem plano legacy atribuído
    if (user.plan !== 'legacy') {
      return NextResponse.json({ 
        error: 'Plano Legacy não atribuído a este usuário' 
      }, { status: 403 });
    }

    // Verificar se já está pago
    if (user.is_paid) {
      return NextResponse.json({ 
        error: 'Plano já está ativo' 
      }, { status: 400 });
    }

    // Pegar Price ID do Legacy (mensal por padrão)
    const priceId = process.env.STRIPE_PRICE_LEGACY_MONTHLY;

    if (!priceId) {
      console.error('[Legacy Checkout] STRIPE_PRICE_LEGACY_MONTHLY não configurado');
      return NextResponse.json({ 
        error: 'Plano Legacy não configurado. Contate o suporte.' 
      }, { status: 500 });
    }

    // Criar Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?plan=legacy`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      metadata: {
        userId: user.id,
        clerkId: userId,
        planType: 'legacy',
      },
    });

    console.log(`[Legacy Checkout] Session criada para ${user.email}: ${session.id}`);

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    console.error('[Legacy Checkout] Erro:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao criar checkout' 
    }, { status: 500 });
  }
}
