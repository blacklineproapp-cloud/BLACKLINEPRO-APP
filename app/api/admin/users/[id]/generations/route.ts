/**
 * API: Histórico de Gerações do Usuário
 * Endpoint para admins visualizarem todas gerações de um usuário
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
  req,
  ctx,
  ...args: unknown[]
) => {
  // Pegar ID do usuário alvo
  const { id: targetUserId } = await (args[0] as RouteContext).params;

  // Parâmetros de query
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Buscar gerações
  let query = supabaseAdmin
    .from('generation_history')
    .select('*', { count: 'exact' })
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filtros opcionais
  if (status) {
    query = query.eq('status', status);
  }

  if (type) {
    query = query.eq('generation_type', type);
  }

  const { data: generations, error, count } = await query;

  if (error) {
    logger.error('[Admin API] Erro ao buscar gerações', { error });
    return NextResponse.json(
      { error: 'Erro ao buscar gerações' },
      { status: 500 }
    );
  }

  // Buscar informações do usuário
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, email, name, plan, is_paid, created_at')
    .eq('id', targetUserId)
    .single();

  // Estatísticas
  const { count: completedCount } = await supabaseAdmin
    .from('generation_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .eq('status', 'completed');

  const { count: failedCount } = await supabaseAdmin
    .from('generation_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .eq('status', 'failed');

  const { count: totalCount } = await supabaseAdmin
    .from('generation_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);

  // Calcular tempo médio de processamento
  const { data: avgTime } = await supabaseAdmin
    .from('generation_history')
    .select('processing_time_ms')
    .eq('user_id', targetUserId)
    .eq('status', 'completed')
    .not('processing_time_ms', 'is', null);

  const avgProcessingTime = avgTime && avgTime.length > 0
    ? Math.round(avgTime.reduce((sum, g) => sum + (g.processing_time_ms || 0), 0) / avgTime.length)
    : 0;

  return NextResponse.json({
    user: targetUser,
    generations: generations || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    },
    stats: {
      total: totalCount || 0,
      completed: completedCount || 0,
      failed: failedCount || 0,
      avgProcessingTime
    }
  });
});
