/**
 * API: /api/organizations/[id]/members
 * Gerenciamento de membros da organização
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getOrganizationMembers,
  isOrganizationOwner,
  removeMember,
} from '@/lib/organizations/members';
import { getOrganizationById } from '@/lib/organizations';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';

// =====================================================
// GET /api/organizations/[id]/members
// Lista todos os membros da organização
// =====================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = id;

    // Buscar user_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar membros
    const members = await getOrganizationMembers(organizationId);

    // Buscar organização para retornar limites
    const organization = await getOrganizationById(organizationId);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    const maxMembers = organization.plan === 'studio' ? 3 : 5;

    return NextResponse.json({
      success: true,
      members,
      member_count: members.length,
      max_members: maxMembers,
      can_add_more: members.length < maxMembers,
    });
  } catch (error: any) {
    console.error('[GET /api/organizations/[id]/members] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar membros' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/organizations/[id]/members
// Remove membro da organização (apenas owner)
// =====================================================
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const organizationId = id;
    const { searchParams } = new URL(req.url);
    const memberIdToRemove = searchParams.get('userId');

    if (!memberIdToRemove) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar user_id do owner
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
        { error: 'Apenas o owner pode remover membros' },
        { status: 403 }
      );
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
  } catch (error: any) {
    console.error('[DELETE /api/organizations/[id]/members] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover membro' },
      { status: 500 }
    );
  }
}
