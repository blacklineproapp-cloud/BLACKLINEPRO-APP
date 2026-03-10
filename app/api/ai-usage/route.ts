import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const GET = withAuth(async (request: NextRequest, { userId, user }) => {
  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const operationType = searchParams.get('operation_type') || 'all';
  const dateRange = searchParams.get('date_range') || 'month';

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build date filter
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
      startDate = new Date(0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Build query - ONLY IA Gen operations
  let query = supabaseAdmin
    .from('ai_usage')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('operation_type', 'generate_idea')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('[AI-Usage] Erro ao buscar histórico IA', error);
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
});
