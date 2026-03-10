/**
 * API: /api/organizations/[id]/members
 * Gerenciamento de membros da organização
 */

import { NextResponse } from 'next/server';
import {
  getOrganizationMembers,
  isOrganizationOwner,
  removeMember,
} from '@/lib/organizations/members';
import { getOrganizationById } from '@/lib/organizations';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { withAuth } from '@/lib/api-middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/organizations/[id]/members
export const GET = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: organizationId } = await context.params;

  const members = await getOrganizationMembers(organizationId);

  const organization = await getOrganizationById(organizationId);

  if (!organization) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }

  const maxMembers = 3; // Studio plan max members

  return NextResponse.json({
    success: true,
    members,
    member_count: members.length,
    max_members: maxMembers,
    can_add_more: members.length < maxMembers,
  });
});

// DELETE /api/organizations/[id]/members
export const DELETE = withAuth(async (req, { userId, user }, context: RouteContext) => {
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
  const { searchParams } = new URL(req.url);
  const memberIdToRemove = searchParams.get('userId');

  if (!memberIdToRemove) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  // Verificar se é owner
  const isOwner = await isOrganizationOwner(organizationId, user.id);
  if (!isOwner) {
    return NextResponse.json({ error: 'Apenas o owner pode remover membros' }, { status: 403 });
  }

  // Remover membro
  const result = await removeMember(organizationId, memberIdToRemove, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Membro removido com sucesso',
  });
});
