/**
 * API: /api/organizations
 * Gerenciamento de organizações (Studio e Enterprise)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserOrganizations, createOrganization } from '@/lib/organizations';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';

// =====================================================
// GET /api/organizations
// Lista todas as organizações do usuário autenticado
// =====================================================
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar user_id pelo clerk_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar organizações
    const organizations = await getUserOrganizations(user.id);

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error: any) {
    console.error('[GET /api/organizations] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar organizações' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/organizations
// Cria nova organização (apenas para Studio/Enterprise)
// Normalmente criada automaticamente pelo webhook, mas pode ser manual
// =====================================================
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMITING: Prevenir abuso na criação de organizações (60 requests/min)
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

    const body = await req.json();
    const { name, plan } = body;

    // Validar campos
    if (!name || !plan) {
      return NextResponse.json(
        { error: 'Nome e plano são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar plano
    if (plan !== 'studio' && plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'Plano deve ser studio ou enterprise' },
        { status: 400 }
      );
    }

    // Buscar user_id pelo clerk_id
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, plan, subscription_status')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se usuário tem subscription ativa do plano correto
    if (user.plan !== plan) {
      return NextResponse.json(
        { error: `Você precisa de uma assinatura ${plan} para criar esta organização` },
        { status: 403 }
      );
    }

    if (user.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Sua assinatura não está ativa' },
        { status: 403 }
      );
    }

    // Verificar se já tem organização
    const existingOrgs = await getUserOrganizations(user.id);
    if (existingOrgs.length > 0) {
      return NextResponse.json(
        { error: 'Você já possui uma organização' },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error('[POST /api/organizations] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar organização' },
      { status: 500 }
    );
  }
}
