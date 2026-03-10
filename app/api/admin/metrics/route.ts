import { withAdminAuth } from '@/lib/api-middleware';

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const GET = withAdminAuth(async () => {
  // =========================================================================
  // MÉTRICAS GERAIS
  // =========================================================================

  const [
    { count: totalUsers },
    { count: paidUsers },
    { count: activeUsers },
    { count: onlineUsersCount },
    { count: blockedUsers },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_paid', true),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
      .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
      .gte('last_active_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_blocked', true),
  ]);

  // =========================================================================
  // MÉTRICAS DE PLANOS
  // =========================================================================

  const { data: planStats } = await supabaseAdmin
    .from('users')
    .select('plan')
    .in('plan', ['free', 'ink', 'pro', 'studio']);

  const planCounts = { free: 0, ink: 0, pro: 0, studio: 0 };
  planStats?.forEach(u => {
    if (u.plan in planCounts) {
      planCounts[u.plan as keyof typeof planCounts]++;
    }
  });

  // =========================================================================
  // RECEITA
  // =========================================================================

  const stripeHistoricalRevenue = 7025.00;

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const [
    { data: realAsaasPayments },
    { data: monthPayments },
  ] = await Promise.all([
    supabaseAdmin.from('payments').select('amount')
      .eq('provider', 'asaas').eq('is_test', false).in('status', ['succeeded', 'paid']),
    supabaseAdmin.from('payments').select('amount')
      .eq('provider', 'asaas').eq('is_test', false).in('status', ['succeeded', 'paid'])
      .gte('created_at', firstDayOfMonth.toISOString()),
  ]);

  const asaasRealRevenue = realAsaasPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  const monthRevenue = monthPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  const totalRevenue = stripeHistoricalRevenue + asaasRealRevenue;

  // =========================================================================
  // RECEITA MENSAL (últimos 12 meses) — para gráfico de tendência
  // =========================================================================

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const { data: revenueByMonth } = await supabaseAdmin
    .from('payments')
    .select('amount, created_at')
    .eq('provider', 'asaas')
    .eq('is_test', false)
    .in('status', ['succeeded', 'paid'])
    .gte('created_at', twelveMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  const monthlyRevenue: Record<string, number> = {};
  revenueByMonth?.forEach(p => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (Number(p.amount) || 0);
  });

  // Build array of last 12 months
  const revenueTimeline: Array<{ month: string; revenue: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    revenueTimeline.push({ month: label, revenue: monthlyRevenue[key] || 0 });
  }

  // =========================================================================
  // RECEITA POR MÉTODO DE PAGAMENTO
  // =========================================================================

  const { data: paymentsByMethod } = await supabaseAdmin
    .from('payments')
    .select('payment_method, amount')
    .eq('provider', 'asaas')
    .eq('is_test', false)
    .in('status', ['succeeded', 'paid']);

  const methodMap: Record<string, { amount: number; count: number }> = {};
  paymentsByMethod?.forEach(p => {
    const method = p.payment_method || 'Outro';
    if (!methodMap[method]) methodMap[method] = { amount: 0, count: 0 };
    methodMap[method].amount += Number(p.amount) || 0;
    methodMap[method].count++;
  });

  const paymentMethods = Object.entries(methodMap).map(([method, data]) => ({
    method,
    amount: data.amount,
    count: data.count,
  }));

  // =========================================================================
  // MRR (Asaas API)
  // =========================================================================

  const { AsaasAdminService } = await import('@/lib/asaas');
  const asaasMetrics = await AsaasAdminService.getFinancialMetrics();
  const mrr = asaasMetrics.mrr;

  // =========================================================================
  // USO DE IA
  // =========================================================================

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalAIRequests },
    { count: todayRequests },
    { data: operationCounts },
  ] = await Promise.all([
    supabaseAdmin.from('ai_usage').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('ai_usage').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabaseAdmin.from('ai_usage').select('operation_type').gte('created_at', sevenDaysAgo),
  ]);

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

  let peakHour = 0;
  let peakCount = 0;
  Object.entries(hourlyActivity).forEach(([hour, count]) => {
    if (count > peakCount) {
      peakHour = parseInt(hour);
      peakCount = count;
    }
  });

  // =========================================================================
  // CUSTOS DE IA
  // =========================================================================

  const firstDayOfYear = new Date();
  firstDayOfYear.setMonth(0, 1);
  firstDayOfYear.setHours(0, 0, 0, 0);

  const [
    { data: todayCosts },
    { data: weekCosts },
    { data: monthCosts },
    { data: yearCosts },
    { data: allCosts },
  ] = await Promise.all([
    supabaseAdmin.from('ai_usage').select('cost').gte('created_at', today.toISOString()),
    supabaseAdmin.from('ai_usage').select('cost').gte('created_at', sevenDaysAgo),
    supabaseAdmin.from('ai_usage').select('cost').gte('created_at', firstDayOfMonth.toISOString()),
    supabaseAdmin.from('ai_usage').select('cost').gte('created_at', firstDayOfYear.toISOString()),
    supabaseAdmin.from('ai_usage').select('cost'),
  ]);

  const sumCost = (arr: any[] | null) => arr?.reduce((s, i) => s + (Number(i.cost) || 0), 0) || 0;

  const todayCost = sumCost(todayCosts);
  const weekCost = sumCost(weekCosts);
  const monthCost = sumCost(monthCosts);
  const yearCost = sumCost(yearCosts);
  const totalCost = sumCost(allCosts);

  // =========================================================================
  // RESPONSE
  // =========================================================================

  return NextResponse.json({
    general: {
      totalUsers: totalUsers || 0,
      paidUsers: paidUsers || 0,
      activeUsers: activeUsers || 0,
      onlineUsers: onlineUsersCount || 0,
      blockedUsers: blockedUsers || 0,
    },
    plans: planCounts,
    revenue: {
      total: totalRevenue,
      thisMonth: monthRevenue,
      stripeHistorical: stripeHistoricalRevenue,
      asaasReal: asaasRealRevenue,
      mrr,
    },
    revenueTimeline,
    paymentMethods,
    aiUsage: {
      totalRequests: totalAIRequests || 0,
      todayRequests: todayRequests || 0,
      operations,
    },
    aiCosts: {
      today: todayCost,
      week: weekCost,
      month: monthCost,
      year: yearCost,
      total: totalCost,
    },
    activity: {
      hourlyActivity,
      peakHour,
      peakCount,
    },
  });
});

export const maxDuration = 60;
