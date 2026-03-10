/**
 * API: /api/organizations/[id]/invite
 * Envio e gerenciamento de convites
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createInvite, getOrganizationInvites, cancelInvite } from '@/lib/organizations/invites';
import { isOrganizationOwner } from '@/lib/organizations/members';
import { getOrganizationById } from '@/lib/organizations';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { withAuth } from '@/lib/api-middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/organizations/[id]/invite
export const GET = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: organizationId } = await context.params;

  const isOwner = await isOrganizationOwner(organizationId, user.id);
  if (!isOwner) {
    return NextResponse.json({ error: 'Apenas o owner pode ver convites' }, { status: 403 });
  }

  const invites = await getOrganizationInvites(organizationId);

  return NextResponse.json({
    success: true,
    invites,
  });
});

// POST /api/organizations/[id]/invite
export const POST = withAuth(async (req, { userId, user }, context: RouteContext) => {
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
  const { email } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email válido é obrigatório' }, { status: 400 });
  }

  // Não pode convidar a si mesmo
  if (email.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Você não pode convidar a si mesmo' }, { status: 400 });
  }

  const isOwner = await isOrganizationOwner(organizationId, user.id);
  if (!isOwner) {
    return NextResponse.json({ error: 'Apenas o owner pode enviar convites' }, { status: 403 });
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }

  const result = await createInvite({
    organizationId,
    email: email.toLowerCase(),
    invitedBy: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    invite: result.invite,
    message: 'Convite enviado com sucesso',
  });
});

// DELETE /api/organizations/[id]/invite
export const DELETE = withAuth(async (req, { userId, user }, context: RouteContext) => {
  const { id: organizationId } = await context.params;
  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get('inviteId');

  if (!inviteId) {
    return NextResponse.json({ error: 'inviteId é obrigatório' }, { status: 400 });
  }

  const result = await cancelInvite(inviteId, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: 'Convite cancelado com sucesso',
  });
});
