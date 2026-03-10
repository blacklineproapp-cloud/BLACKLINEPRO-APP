/**
 * API: Logs de Atividade do Usuário
 * Endpoint para admins visualizarem logs de um usuário específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const GET = withAdminAuth(async (
  req: NextRequest,
  ctx,
  routeCtx: RouteContext
) => {
  // Pegar ID do usuário alvo
  const { id: targetUserId } = await routeCtx.params;

  // Parâmetros de query
  const { searchParams } = new URL(req.url);
  const activityType = searchParams.get('type');
  const onlyErrors = searchParams.get('errors') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Buscar logs
  let query = supabaseAdmin
    .from('user_activity_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filtros opcionais
  if (activityType) {
    query = query.eq('activity_type', activityType);
  }

  if (onlyErrors) {
    query = query.eq('success', false);
  }

  const { data: logs, error, count } = await query;

  if (error) {
    logger.error('[Admin API] Erro ao buscar logs', { error });
    return NextResponse.json(
      { error: 'Erro ao buscar logs' },
      { status: 500 }
    );
  }

  // Buscar informações do usuário
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, email, name, plan, is_paid, created_at')
    .eq('id', targetUserId)
    .single();

  // Estatísticas rápidas
  const { count: errorCount } = await supabaseAdmin
    .from('user_activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .eq('success', false);

  const { count: totalLogsCount } = await supabaseAdmin
    .from('user_activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);

  return NextResponse.json({
    user: targetUser,
    logs: logs || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    },
    stats: {
      totalLogs: totalLogsCount || 0,
      totalErrors: errorCount || 0
    }
  });
});
