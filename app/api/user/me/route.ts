import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log('[User API] Não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('[User API] Buscando dados para userId:', userId);

    // Usar getOrCreateUser para garantir que o usuário existe
    const user = await getOrCreateUser(userId);

    if (!user) {
      console.error('[User API] Usuário não encontrado após getOrCreateUser');
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('[User API] Usuário encontrado:', user.email);

    // Retornar apenas os campos necessários
    return NextResponse.json({
      plan: user.plan || 'free',
      is_paid: user.is_paid || false,
      subscription_status: user.subscription_status || 'inactive',
      subscription_expires_at: user.subscription_expires_at || null,
      admin_courtesy: user.admin_courtesy || false,
      stripe_customer_id: user.stripe_customer_id || null
    });
  } catch (error: any) {
    console.error('[User API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do usuário: ' + error.message },
      { status: 500 }
    );
  }
}
