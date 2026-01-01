import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin as checkIsAdmin } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-config';
import { supabaseAdmin } from '@/lib/supabase';

// Middleware para verificar admin (usando config centralizada)
async function userIsAdmin(userId: string): Promise<{ userIsAdmin: boolean; adminId?: string }> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('clerk_id', userId)
    .single();

  // Comparação case-insensitive usando config centralizada
  const hasAccess = !!(user && isAdminEmail(user.email || ''));
  
  console.log('[Admin Users] Check:', { email: user?.email, hasAccess, error: error?.message });
  
  return { userIsAdmin: hasAccess, adminId: user?.id };
}

// GET - Listar todos os usuários
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminCheck = await userIsAdmin(userId);
    if (!adminCheck.userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const plan = url.searchParams.get('plan') || '';
    const status = url.searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (plan && plan !== 'all') {
      query = query.eq('plan', plan);
    }

    if (status === 'blocked') {
      query = query.eq('is_blocked', true);
    } else if (status === 'active') {
      query = query.eq('is_blocked', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) throw error;

    // ✅ OTIMIZADO: Uma única query para pegar contagem de todos os usuários
    // Em vez de N queries separadas (N+1 problem)
    const userIds = (users || []).map(u => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Query agregada: conta requests por usuário em uma única chamada
    const { data: usageCounts } = await supabaseAdmin
      .from('ai_usage')
      .select('user_id')
      .in('user_id', userIds);

    // Criar mapa de contagens
    const countMap = new Map<string, number>();
    (usageCounts || []).forEach(usage => {
      const count = countMap.get(usage.user_id) || 0;
      countMap.set(usage.user_id, count + 1);
    });

    // Adicionar métricas aos usuários
    const usersWithMetrics = (users || []).map(user => ({
      ...user,
      total_requests: countMap.get(user.id) || 0,
    }));

    return NextResponse.json({
      users: usersWithMetrics,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Erro admin users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Ações admin (bloquear, desbloquear, alterar plano)
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminCheck = await userIsAdmin(userId);
    if (!adminCheck.userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetUserId, reason, newPlan } = body;

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    switch (action) {
      case 'block': {
        await supabaseAdmin
          .from('users')
          .update({
            is_blocked: true,
            blocked_reason: reason || 'Bloqueado por administrador',
            blocked_at: new Date().toISOString(),
            blocked_by: adminCheck.adminId,
          })
          .eq('id', targetUserId);

        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: adminCheck.adminId!,
          action: 'block_user',
          target_user_id: targetUserId,
          details: { reason },
        });

        return NextResponse.json({ message: 'Usuário bloqueado' });
      }

      case 'unblock': {
        await supabaseAdmin
          .from('users')
          .update({
            is_blocked: false,
            blocked_reason: null,
            blocked_at: null,
            blocked_by: null,
          })
          .eq('id', targetUserId);

        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: adminCheck.adminId!,
          action: 'unblock_user',
          target_user_id: targetUserId,
        });

        return NextResponse.json({ message: 'Usuário desbloqueado' });
      }

      case 'change_plan': {
        const { isCourtesy, sendPaymentLink } = body;

        if (!newPlan || !['free', 'starter', 'pro', 'studio'].includes(newPlan)) {
          return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
        }

        const updates: any = { plan: newPlan };

        if (newPlan === 'free') {
          updates.is_paid = false;
          updates.tools_unlocked = false;
          updates.subscription_status = 'inactive';
          updates.admin_courtesy = false;
          updates.admin_courtesy_granted_by = null;
          updates.admin_courtesy_granted_at = null;
        } else if (newPlan === 'starter') {
          updates.is_paid = true;
          updates.tools_unlocked = false;
          updates.subscription_status = 'active';
          
          if (isCourtesy) {
            updates.admin_courtesy = true;
            updates.admin_courtesy_granted_by = adminCheck.adminId;
            updates.admin_courtesy_granted_at = new Date().toISOString();
          }
        } else if (newPlan === 'pro' || newPlan === 'studio') {
          updates.is_paid = true;
          updates.tools_unlocked = true;
          updates.subscription_status = 'active';
          
          if (isCourtesy) {
            updates.admin_courtesy = true;
            updates.admin_courtesy_granted_by = adminCheck.adminId;
            updates.admin_courtesy_granted_at = new Date().toISOString();
          }
        }

        await supabaseAdmin
          .from('users')
          .update(updates)
          .eq('id', targetUserId);

        // Buscar clerk_id para invalidar cache
        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('clerk_id')
          .eq('id', targetUserId)
          .single();

        // Invalidar cache do usuário
        if (targetUser?.clerk_id) {
          const { invalidateCache } = await import('@/lib/cache');
          await invalidateCache(targetUser.clerk_id, 'users');
          console.log(`[Admin] Cache invalidado para: ${targetUser.clerk_id}`);
        }

        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: adminCheck.adminId!,
          action: isCourtesy ? 'grant_courtesy_plan' : 'change_plan',
          target_user_id: targetUserId,
          details: { newPlan, isCourtesy: isCourtesy || false },
        });

        return NextResponse.json({ 
          message: isCourtesy ? 'Plano cortesia ativado' : 'Plano alterado',
          success: true
        });
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro admin action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Atualizar usuário (legacy)
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminCheck = await userIsAdmin(userId);
    if (!adminCheck.userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { targetUserId, updates } = await req.json();

    const allowedFields = ['is_paid', 'subscription_status', 'tools_unlocked', 'subscription_expires_at', 'plan'];
    const sanitizedUpdates: any = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(sanitizedUpdates)
      .eq('id', targetUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro admin update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
