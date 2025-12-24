import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Emails com acesso admin (case-insensitive)
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin (apenas por email, sem campo is_admin)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('clerk_id', userId)
      .single();

    // Log para debug
    console.log('[Admin Check]', { 
      clerkId: userId, 
      userEmail: user?.email, 
      error: userError?.message 
    });

    // Comparação case-insensitive
    const userEmailLower = user?.email?.toLowerCase() || '';
    const isAdmin = user && ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);
    
    if (!isAdmin) {
      console.log('[Admin Check] ACESSO NEGADO para:', user?.email);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('[Admin Check] ACESSO PERMITIDO para:', user?.email);

    // =========================================================================
    // MÉTRICAS GERAIS
    // =========================================================================

    // Total de usuários
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Usuários pagantes
    const { count: paidUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_paid', true);

    // Usuários ativos (últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', sevenDaysAgo);

    // Usuários online (últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: onlineUsers } = await supabaseAdmin
      .from('active_sessions')
      .select('user_id', { count: 'exact' })
      .gte('last_activity', fiveMinutesAgo);

    const uniqueOnlineUsers = new Set(onlineUsers?.map(s => s.user_id)).size;

    // Usuários bloqueados
    const { count: blockedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_blocked', true);

    // =========================================================================
    // MÉTRICAS DE PLANOS
    // =========================================================================

    const { data: planStats } = await supabaseAdmin
      .from('users')
      .select('plan')
      .in('plan', ['free', 'starter', 'pro', 'studio']);

    const planCounts = {
      free: 0,
      starter: 0,
      pro: 0,
      studio: 0,
    };

    planStats?.forEach(u => {
      if (u.plan in planCounts) {
        planCounts[u.plan as keyof typeof planCounts]++;
      }
    });

    // =========================================================================
    // RECEITA
    // =========================================================================

    // Receita total
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded');

    const totalRevenue = allPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    // Receita deste mês
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: monthPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')
      .gte('created_at', firstDayOfMonth.toISOString());

    const monthRevenue = monthPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    // =========================================================================
    // USO DE IA
    // =========================================================================

    const { count: totalAIRequests } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true });

    // Requisições hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayRequests } = await supabaseAdmin
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Operações mais usadas
    const { data: operationCounts } = await supabaseAdmin
      .from('ai_usage')
      .select('operation_type')
      .gte('created_at', sevenDaysAgo);

    const operations: Record<string, number> = {};
    operationCounts?.forEach(op => {
      operations[op.operation_type] = (operations[op.operation_type] || 0) + 1;
    });

    // =========================================================================
    // HORÁRIOS DE PICO (últimas 24h)
    // =========================================================================

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: hourlyData } = await supabaseAdmin
      .from('ai_usage')
      .select('created_at')
      .gte('created_at', last24h);

    const hourlyActivity: Record<number, number> = {};
    hourlyData?.forEach(item => {
      const hour = new Date(item.created_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    // Encontrar horário de pico
    let peakHour = 0;
    let peakCount = 0;
    Object.entries(hourlyActivity).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakHour = parseInt(hour);
        peakCount = count;
      }
    });

    // =========================================================================
    // RESPONSE
    // =========================================================================

    return NextResponse.json({
      general: {
        totalUsers: totalUsers || 0,
        paidUsers: paidUsers || 0,
        activeUsers: activeUsers || 0,
        onlineUsers: uniqueOnlineUsers,
        blockedUsers: blockedUsers || 0,
      },
      plans: planCounts,
      revenue: {
        total: totalRevenue,
        thisMonth: monthRevenue,
      },
      aiUsage: {
        totalRequests: totalAIRequests || 0,
        todayRequests: todayRequests || 0,
        operations,
      },
      activity: {
        hourlyActivity,
        peakHour,
        peakCount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar métricas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar métricas: ' + error.message },
      { status: 500 }
    );
  }
}
