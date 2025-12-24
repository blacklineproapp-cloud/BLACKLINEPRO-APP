/**
 * API Route: Customer Portal
 * Cria sessão do Stripe Customer Portal para gerenciamento de assinatura
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CheckoutService, CustomerService } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Buscar customer do usuário
    const customer = await CustomerService.getByUserId(userId);

    if (!customer || !customer.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Customer não encontrado. Você precisa ter uma assinatura ativa.' },
        { status: 404 }
      );
    }

    // 3. Criar portal session
    const { url } = await CheckoutService.createPortalSession({
      customerId: customer.stripe_customer_id,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assinatura`
    });

    console.log('[Portal API] Portal session criada para user:', userId);

    // 4. Retornar URL do portal
    return NextResponse.json({ url });

  } catch (error: any) {
    console.error('[Portal API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar portal session: ' + error.message },
      { status: 500 }
    );
  }
}
