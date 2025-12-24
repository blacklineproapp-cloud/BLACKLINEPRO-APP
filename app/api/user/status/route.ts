import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';

// GET - Retorna status do usuário (assinatura, tools, etc)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isSubscribed: user.is_paid && user.subscription_status === 'active',
      subscriptionStatus: user.subscription_status,
      subscriptionExpiresAt: user.subscription_expires_at,
      toolsUnlocked: user.tools_unlocked,
      createdAt: user.created_at,
    });
  } catch (error: any) {
    console.error('Erro ao buscar status:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status' },
      { status: 500 }
    );
  }
}
