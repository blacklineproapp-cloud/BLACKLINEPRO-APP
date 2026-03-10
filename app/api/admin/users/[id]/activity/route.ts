import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const GET = withAdminAuth(async (
  req: Request,
  ctx,
  routeCtx: { params: Promise<{ id: string }> }
) => {
  const { id } = await routeCtx.params;

  // Buscar últimas 50 atividades do usuário
  const { data: activities, error } = await supabaseAdmin
    .from('ai_usage')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('[Admin] Erro ao buscar atividades', { error });
    return NextResponse.json({ error: 'Erro ao buscar atividades' }, { status: 500 });
  }

  // Calcular estatísticas
  const stats = {
    total: activities?.length || 0,
    totalCost: activities?.reduce((sum, a) => sum + (Number(a.cost) || 0), 0) || 0,
    byType: {
      editor: activities?.filter(a => a.usage_type === 'editor_generation').length || 0,
      ai: activities?.filter(a => a.usage_type === 'ai_request').length || 0,
      tools: activities?.filter(a => a.usage_type === 'tool_usage').length || 0,
    }
  };

  return NextResponse.json({ activities: activities || [], stats });
});
