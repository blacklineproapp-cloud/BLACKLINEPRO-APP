import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { activateUserAtomic } from '@/lib/admin/user-activation';
import { logger } from '@/lib/logger';

// GET - Listar todos os usuários
export const GET = withAdminAuth(async (req, { adminId }) => {
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
    // Sanitizar input para prevenir SQL injection
    const sanitizedSearch = search.slice(0, 100).replace(/[%_\\]/g, '\\$&');
    query = query.or(`email.ilike.%${sanitizedSearch}%,name.ilike.%${sanitizedSearch}%`);
  }

  if (plan && plan !== 'all') {
    query = query.eq('plan', plan);
  }

  if (status === 'blocked') {
    query = query.eq('is_blocked', true);
  } else if (status === 'active') {
    query = query.eq('is_blocked', false);
  } else if (status === 'courtesy') {
    query = query.eq('admin_courtesy', true);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: users, count, error } = await query;

  if (error) throw error;

  // OTIMIZADO: Uma única query para pegar contagem de todos os usuários
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

  // BUSCAR ESTATISTICAS GLOBAIS (Parallel Requests)
  const [
    { count: totalCount },
    { count: paidCount },
    { count: freeCount },
    { count: blockedCount }
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_paid', true),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_paid', false),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_blocked', true)
  ]);

  return NextResponse.json({
    users: usersWithMetrics,
    stats: {
      total: totalCount || 0,
      paid: paidCount || 0,
      free: freeCount || 0,
      blocked: blockedCount || 0
    },
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
});

// POST - Ações admin (bloquear, desbloquear, alterar plano)
export const POST = withAdminAuth(async (req, { adminId }) => {
  const body = await req.json();
  const { action, targetUserId, reason, newPlan } = body;

  if (!action || !targetUserId) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  switch (action) {
    case 'block': {
      // SEGURANCA: Prevenir admin de bloquear própria conta
      if (targetUserId === adminId) {
        logger.warn('[Admin Users] Admin tentou bloquear própria conta', { adminId });
        return NextResponse.json({
          error: 'Você não pode bloquear sua própria conta.'
        }, { status: 403 });
      }

      await supabaseAdmin
        .from('users')
        .update({
          is_blocked: true,
          blocked_reason: reason || 'Bloqueado por administrador',
          blocked_at: new Date().toISOString(),
          blocked_by: adminId,
        })
        .eq('id', targetUserId);

      await supabaseAdmin.from('admin_logs').insert({
        admin_user_id: adminId,
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
        admin_user_id: adminId,
        action: 'unblock_user',
        target_user_id: targetUserId,
      });

      return NextResponse.json({ message: 'Usuário desbloqueado' });
    }

    case 'change_plan': {
      // SEGURANCA: Prevenir admin de editar própria conta
      if (targetUserId === adminId) {
        logger.warn('[Admin Users] Admin tentou editar própria conta', { adminId });
        return NextResponse.json({
          error: 'Você não pode alterar o plano da sua própria conta. Solicite a outro administrador.'
        }, { status: 403 });
      }

      const { isCourtesy, sendPaymentLink, courtesyDurationDays } = body;

      if (!newPlan || !['free', 'ink', 'pro', 'studio'].includes(newPlan)) {
        return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
      }

      const updates: any = { plan: newPlan };

      // Configuração de Status Baseado no Plano
      if (newPlan === 'free') {
        updates.is_paid = false;
        updates.tools_unlocked = false;
        updates.subscription_status = 'inactive';
      } else {
        // Planos Pagos (Ink, Pro, Studio)
        updates.is_paid = true;
        updates.subscription_status = 'active';
        updates.tools_unlocked = newPlan === 'pro' || newPlan === 'studio';
      }

      // USAR FUNCAO ATOMICA UNIFICADA
      try {
        const result = await activateUserAtomic(targetUserId, newPlan, {
          isPaid: updates.is_paid,
          toolsUnlocked: updates.tools_unlocked,
          subscriptionStatus: updates.subscription_status,
          adminId: adminId,
          isCourtesy: isCourtesy,
          courtesyDurationDays: courtesyDurationDays || 30
        });

        logger.info('[Admin] Ativação atômica concluída', { message: result.message });

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
          logger.info('[Admin] Cache invalidado', { clerkId: targetUser.clerk_id });
        }

        return NextResponse.json({
          message: isCourtesy ? 'Plano cortesia ativado' : result.message,
          success: true,
          deletedRecords: result.deleted_records,
          oldPlan: result.old_plan,
          newPlan: result.new_plan
        });

      } catch (activationError: any) {
        logger.error('[Admin] Erro na ativação atômica', { error: activationError });
        return NextResponse.json({
          error: 'Erro ao ativar usuário: ' + activationError.message
        }, { status: 500 });
      }
    }

    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }
});

// PATCH - Atualizar usuário (legacy)
export const PATCH = withAdminAuth(async (req) => {
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
});
