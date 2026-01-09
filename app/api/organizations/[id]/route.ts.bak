/**
 * API: /api/organizations/[id]
 * Detalhes e atualização de organização específica
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrganizationById, updateOrganization } from '@/lib/organizations';
import { isOrganizationMember, isOrganizationOwner } from '@/lib/organizations/members';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';

// =====================================================
// GET /api/organizations/[id]
// Busca detalhes da organização
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

    // Verificar se é membro
    const isMember = await isOrganizationMember(organizationId, user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Você não é membro desta organização' },
        { status: 403 }
      );
    }

    // Buscar organização
    const organization = await getOrganizationById(organizationId);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error: any) {
    console.error('[GET /api/organizations/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar organização' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH /api/organizations/[id]
// Atualiza dados da organização (apenas owner)
// =====================================================
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMITING: Prevenir abuso (60 requests/min)
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
    const { name } = body;

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
        { error: 'Apenas o owner pode atualizar a organização' },
        { status: 403 }
      );
    }

    // Validar dados
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Atualizar organização
    const success = await updateOrganization(organizationId, { name });

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao atualizar organização' },
        { status: 500 }
      );
    }

    // Buscar organização atualizada
    const organization = await getOrganizationById(organizationId);

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error: any) {
    console.error('[PATCH /api/organizations/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar organização' },
      { status: 500 }
    );
  }
}
