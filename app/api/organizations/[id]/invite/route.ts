/**
 * API: /api/organizations/[id]/invite
 * Envio e gerenciamento de convites
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createInvite, getOrganizationInvites, cancelInvite } from '@/lib/organizations/invites';
import { isOrganizationOwner } from '@/lib/organizations/members';
import { getOrganizationById } from '@/lib/organizations';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';

// =====================================================
// GET /api/organizations/[id]/invite
// Lista convites pendentes da organização
// =====================================================
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const organizationId = params.id;

    // Buscar user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se é owner
    const isOwner = await isOrganizationOwner(organizationId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Apenas o owner pode ver convites' },
        { status: 403 }
      );
    }

    // Buscar convites pendentes
    const invites = await getOrganizationInvites(organizationId);

    return NextResponse.json({
      success: true,
      invites,
    });
  } catch (error: any) {
    console.error('[GET /api/organizations/[id]/invite] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar convites' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/organizations/[id]/invite
// Cria novo convite para adicionar membro
// =====================================================
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMITING: Prevenir spam de convites (60 requests/min)
    const identifier = await getRateLimitIdentifier(clerkId);

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

    const organizationId = params.id;
    const body = await req.json();
    const { email } = body;

    // Validar email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email válido é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Não pode convidar a si mesmo
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Você não pode convidar a si mesmo' },
        { status: 400 }
      );
    }

    // Verificar se é owner
    const isOwner = await isOrganizationOwner(organizationId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Apenas o owner pode enviar convites' },
        { status: 403 }
      );
    }

    // Buscar organização para enviar no email
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    // Criar convite
    const result = await createInvite({
      organizationId,
      email: email.toLowerCase(),
      invitedBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // TODO: Enviar email com link de convite
    // const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${result.invite.token}`;
    // await sendInviteEmail(email, organization.name, inviteUrl);

    return NextResponse.json({
      success: true,
      invite: result.invite,
      message: 'Convite enviado com sucesso',
    });
  } catch (error: any) {
    console.error('[POST /api/organizations/[id]/invite] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar convite' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/organizations/[id]/invite
// Cancela convite pendente
// =====================================================
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const organizationId = params.id;
    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json(
        { error: 'inviteId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Cancelar convite
    const result = await cancelInvite(inviteId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Convite cancelado com sucesso',
    });
  } catch (error: any) {
    console.error('[DELETE /api/organizations/[id]/invite] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao cancelar convite' },
      { status: 500 }
    );
  }
}
