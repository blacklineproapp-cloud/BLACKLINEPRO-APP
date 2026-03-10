export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

export const GET = withAuth(async (req, { userId, user }) => {
  logger.info('[User] Buscando dados', { userId });

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
});
