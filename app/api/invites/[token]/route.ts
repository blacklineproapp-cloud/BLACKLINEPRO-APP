/**
 * API: /api/invites/[token]
 * Validação e aceitação de convites
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getInviteByToken, acceptInvite } from '@/lib/organizations/invites';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';

// =====================================================
// GET /api/invites/[token]
// Valida token e retorna dados do convite
// =====================================================
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Buscar convite
    const invite = await getInviteByToken(token);

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite inválido ou expirado' },
        { status: 404 }
      );
    }

    // Buscar dados da organização e quem convidou
    const { data: inviteDetails } = await supabaseAdmin
      .from('organization_invites')
      .select(
        `
        *,
        organization:organizations (
          id,
          name,
          plan
        ),
        inviter:users!invited_by (
          name,
          email
        )
      `
      )
      .eq('token', token)
      .single();

    if (!inviteDetails) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invite: {
        email: inviteDetails.email,
        organization: inviteDetails.organization,
        inviter: inviteDetails.inviter,
        expires_at: inviteDetails.expires_at,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/invites/[token]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar convite' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/invites/[token]
// Aceita convite e adiciona usuário à organização
// =====================================================
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMITING: Prevenir abuso ao aceitar convites (60 requests/min)
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

    const token = params.token;

    // Buscar convite para validar email
    const invite = await getInviteByToken(token);

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite inválido ou expirado' },
        { status: 404 }
      );
    }

    // Buscar user_id e validar email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se email bate com o convite
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Este convite foi enviado para ${invite.email}. Você está logado como ${user.email}.`,
        },
        { status: 403 }
      );
    }

    // Aceitar convite
    const result = await acceptInvite(token, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      organization: result.organization,
      message: 'Convite aceito com sucesso! Você agora é membro da organização.',
    });
  } catch (error: any) {
    console.error('[POST /api/invites/[token]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao aceitar convite' },
      { status: 500 }
    );
  }
}
