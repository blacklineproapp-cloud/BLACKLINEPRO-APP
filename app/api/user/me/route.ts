export const dynamic = 'force-dynamic';

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

    // 🚀 OTIMIZADO: Usar getOrCreateUser que tem retry interno e CACHE
    const user = await getOrCreateUser(userId);

    if (!user) {
      console.warn('[User API] Usuário não encontrado após getOrCreateUser');
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('[User API] Usuário encontrado:', user.email);

    // Verificar cancelamento agendado:
    // Para Asaas, o cancelamento é imediato (seta is_paid: false e plan: free na hora),
    // então scheduled_to_cancel_at nunca será preenchido — comportamento correto do gateway.
    // Mantemos a lógica simples: se status é canceled mas subscription_expires_at > now, é agendado.
    let scheduledToCancelAt = null;
    if (
      user.subscription_status === 'canceled' &&
      user.subscription_expires_at &&
      new Date(user.subscription_expires_at) > new Date()
    ) {
      scheduledToCancelAt = user.subscription_expires_at;
    }

    // Retornar apenas os campos necessários
    return NextResponse.json({
      plan: user.plan || 'free',
      is_paid: user.is_paid || false,
      subscription_status: user.subscription_status || 'inactive',
      subscription_expires_at: user.subscription_expires_at || null,
      admin_courtesy: user.admin_courtesy || false,
      is_blocked: user.is_blocked || false,
      blocked_reason: user.blocked_reason || null,
      asaas_subscription_id: user.asaas_subscription_id || null,
      asaas_customer_id: user.asaas_customer_id || null,
      scheduled_to_cancel_at: scheduledToCancelAt
    });
  } catch (error: any) {
    console.error('[User API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do usuário: ' + error.message },
      { status: 500 }
    );
  }
}
