/**
 * API: /api/organizations
 * Gerenciamento de organizações (Studio)
 */

import { NextResponse } from 'next/server';
import { getUserOrganizations, createOrganization } from '@/lib/organizations';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { withAuth } from '@/lib/api-middleware';

// GET /api/organizations
export const GET = withAuth(async (req, { userId, user }) => {
  const organizations = await getUserOrganizations(user.id);

  return NextResponse.json({
    success: true,
    organizations,
  });
});

// POST /api/organizations
export const POST = withAuth(async (req, { userId, user }) => {
  // 🛡️ RATE LIMITING
  const identifier = await getRateLimitIdentifier(userId);

  if (apiLimiter) {
    const { success, limit, remaining, reset } = await apiLimiter.limit(identifier);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Muitas requisições',
          message: 'Você atingiu o limite de requisições. Tente novamente em alguns minutos.',
          limit,
          remaining,
          reset: new Date(reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  const body = await req.json();
  const { name, plan } = body;

  if (!name || !plan) {
    return NextResponse.json({ error: 'Nome e plano são obrigatórios' }, { status: 400 });
  }

  if (plan !== 'studio') {
    return NextResponse.json({ error: 'Plano deve ser studio' }, { status: 400 });
  }

  // Verificar se usuário tem subscription ativa do plano correto
  if (user.plan !== plan) {
    return NextResponse.json(
      { error: `Você precisa de uma assinatura ${plan} para criar esta organização` },
      { status: 403 }
    );
  }

  if (user.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Sua assinatura não está ativa' }, { status: 403 });
  }

  // Verificar se já tem organização
  const existingOrgs = await getUserOrganizations(user.id);
  if (existingOrgs.length > 0) {
    return NextResponse.json({ error: 'Você já possui uma organização' }, { status: 400 });
  }

  // Criar organização
  const result = await createOrganization({
    name,
    plan,
    owner_id: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    organization: result.organization,
  });
});
