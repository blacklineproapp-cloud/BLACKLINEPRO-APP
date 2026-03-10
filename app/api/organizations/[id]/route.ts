/**
 * API: /api/organizations/[id]
 * Detalhes e atualização de organização específica
 */

import { NextResponse } from 'next/server';
import { getOrganizationById, updateOrganization } from '@/lib/organizations';
import { isOrganizationMember, isOrganizationOwner } from '@/lib/organizations/members';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { withAuth } from '@/lib/api-middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/organizations/[id]
export const GET = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: organizationId } = await context.params;

  // Verificar se é membro
  const isMember = await isOrganizationMember(organizationId, user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Você não é membro desta organização' }, { status: 403 });
  }

  const organization = await getOrganizationById(organizationId);

  if (!organization) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    organization,
  });
});

// PATCH /api/organizations/[id]
export const PATCH = withAuth(async (req, { userId, user }, context: RouteContext) => {
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

  const { id: organizationId } = await context.params;
  const body = await req.json();
  const { name } = body;

  // Verificar se é owner
  const isOwner = await isOrganizationOwner(organizationId, user.id);
  if (!isOwner) {
    return NextResponse.json({ error: 'Apenas o owner pode atualizar a organização' }, { status: 403 });
  }

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  const success = await updateOrganization(organizationId, { name });

  if (!success) {
    return NextResponse.json({ error: 'Erro ao atualizar organização' }, { status: 500 });
  }

  const organization = await getOrganizationById(organizationId);

  return NextResponse.json({
    success: true,
    organization,
  });
});
