import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrSetCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

// GET - Estatísticas gerais do app (OTIMIZADO)
export const GET = withAdminAuth(async () => {
  // Cache de 1 hora (stats mudam lentamente)
  const stats = await getOrSetCache(
    'dashboard',
    async () => {
      const { data, error } = await supabaseAdmin
        .from('admin_dashboard_stats')
        .select('*')
        .single();

      if (error) {
        // Fallback para queries separadas se VIEW não existir ainda
        logger.warn('[Stats] VIEW admin_dashboard_stats não encontrada, usando fallback');

        const [
          { count: totalUsers },
          { count: activeUsers },
          { count: totalProjects },
          { data: payments },
          { count: aiUsageToday },
          { data: aiCosts },
          { count: newUsersWeek }
        ] = await Promise.all([
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active').eq('is_paid', true),
          supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('payments').select('amount').eq('status', 'succeeded'),
          supabaseAdmin.from('ai_usage').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date().toISOString().split('T')[0]),
          supabaseAdmin.from('ai_usage').select('cost'),
          supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        return {
          total_users: totalUsers || 0,
          active_users: activeUsers || 0,
          total_projects: totalProjects || 0,
          total_revenue: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
          ai_usage_today: aiUsageToday || 0,
          total_ai_cost: aiCosts?.reduce((sum, a) => sum + Number(a.cost), 0) || 0,
          new_users_week: newUsersWeek || 0
        };
      }

      return data;
    },
    {
      ttl: 3600000, // 1 hora
      namespace: 'admin',
    }
  );

  // Calcular taxa de conversão
  const conversionRate = stats.total_users
    ? ((stats.active_users / stats.total_users) * 100).toFixed(1)
    : 0;

  return NextResponse.json({
    totalUsers: stats.total_users,
    activeUsers: stats.active_users,
    totalProjects: stats.total_projects,
    totalRevenue: Number(stats.total_revenue),
    aiUsageToday: stats.ai_usage_today,
    totalAiCost: Number(stats.total_ai_cost),
    newUsersWeek: stats.new_users_week,
    conversionRate
  });
});
