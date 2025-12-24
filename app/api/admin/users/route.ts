import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Lista de emails com acesso admin (case-insensitive)
const ADMIN_EMAILS = [
  'erickrussomat@gmail.com',
  'yurilojavirtual@gmail.com',
];

// Middleware para verificar admin
async function isAdmin(userId: string): Promise<{ isAdmin: boolean; adminId?: string }> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('clerk_id', userId)
    .single();

  // Comparação case-insensitive (apenas por email, sem campo is_admin no banco)
  const userEmailLower = user?.email?.toLowerCase() || '';
  const hasAccess = !!(user && ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower));
  
  console.log('[Admin Users] Check:', { email: user?.email, hasAccess, error: error?.message });
  
  return { isAdmin: hasAccess, adminId: user?.id };
}

// GET - Listar todos os usuários
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const adminCheck = await isAdmin(userId);
    if (!adminCheck.isAdmin) {
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

    // Adicionar métricas de cada usuário
    const usersWithMetrics = await Promise.all(
      (users || []).map(async (user) => {
        const { count: requestCount } = await supabaseAdmin
          .from('ai_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          ...user,
          total_requests: requestCount || 0,
        };
      })
    );

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

    const adminCheck = await isAdmin(userId);
    if (!adminCheck.isAdmin) {
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
        if (!newPlan || !['free', 'starter', 'pro', 'studio'].includes(newPlan)) {
          return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
        }

        const updates: any = { plan: newPlan };

        if (newPlan === 'free') {
          updates.is_paid = false;
          updates.tools_unlocked = false;
        } else if (newPlan === 'starter') {
          updates.is_paid = true;
          updates.tools_unlocked = false;
        } else if (newPlan === 'pro' || newPlan === 'studio') {
          updates.is_paid = true;
          updates.tools_unlocked = true;
        }

        await supabaseAdmin
          .from('users')
          .update(updates)
          .eq('id', targetUserId);

        await supabaseAdmin.from('admin_logs').insert({
          admin_user_id: adminCheck.adminId!,
          action: 'change_plan',
          target_user_id: targetUserId,
          details: { newPlan },
        });

        return NextResponse.json({ message: 'Plano alterado' });
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

    const adminCheck = await isAdmin(userId);
    if (!adminCheck.isAdmin) {
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
