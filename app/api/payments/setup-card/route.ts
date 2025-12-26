import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

/**
 * POST - Usuário solicita clientSecret para adicionar/atualizar método de pagamento
 *
 * Body: {} (vazio)
 *
 * Retorna clientSecret do Setup Intent para uso com Stripe Elements
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar usuário no banco
    const user = await getOrCreateUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('[Setup Card] Usuário solicitando setup de pagamento:', user.email);

    // Buscar ou criar customer no Stripe
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let stripeCustomerId: string;

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      // Criar customer no Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          clerk_id: userId,
          user_id: user.id
        }
      });

      stripeCustomerId = customer.id;

      // Salvar customer no banco
      await supabaseAdmin.from('customers').insert({
        user_id: user.id,
        stripe_customer_id: customer.id,
        email: user.email,
        nome: user.name
      });
    }

    // Criar Setup Intent para uso com Stripe Elements
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        user_id: user.id,
        clerk_id: userId,
        setup_type: 'user_initiated'
      }
    });

    console.log('[Setup Card] ✅ Setup Intent criado:', setupIntent.id);

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret
    });

  } catch (error: any) {
    console.error('[Setup Card] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
