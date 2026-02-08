import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('clerk_id', userId)
      .single();

    const userIsAdmin = await isAdmin(userId);

    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

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
    const { count: onlineUsersCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', fiveMinutesAgo);

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
      .in('plan', ['free', 'starter', 'pro', 'studio', 'enterprise', 'legacy']);

    const planCounts = {
      free: 0,
      starter: 0,
      pro: 0,
      studio: 0,
      enterprise: 0,
      legacy: 0,
    };

    planStats?.forEach(u => {
      if (u.plan in planCounts) {
        planCounts[u.plan as keyof typeof planCounts]++;
      }
    });

    // =========================================================================
    // RECEITA CONSOLIDADA (STRIPE + ASAAS)
    // =========================================================================

    // 1. Receita Histórica do Stripe (Valor confirmado no resumo de migração)
    const stripeHistoricalRevenue = 7025.00;

    // 2. Receita Asaas (Distinguir Real vs Teste)
    const { data: realAsaasPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('provider', 'asaas')
      .eq('is_test', false)
      .in('status', ['succeeded', 'paid']);

    const asaasRealRevenue = realAsaasPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    const { data: testAsaasPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('is_test', true)
      .in('status', ['succeeded', 'paid']);

    const asaasTestRevenue = testAsaasPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    const totalRevenue = stripeHistoricalRevenue + asaasRealRevenue;

    // Receita deste mês (Apenas Asaas Real)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: monthPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('provider', 'asaas')
      .eq('is_test', false)
      .in('status', ['succeeded', 'paid'])
      .gte('created_at', firstDayOfMonth.toISOString());

    const monthRevenue = monthPayments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    // =========================================================================
    // KPIS DA MIGRAÇÃO (STRIPE -> ASAAS)
    // =========================================================================

    // Total na fila de migração
    const { count: totalMigrationQueue } = await supabaseAdmin
      .from('migration_queue')
      .select('*', { count: 'exact', head: true });

    // Já migraram (Forneceram CPF e criaram assinatura)
    const { count: migratedCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('migration_status', 'migrated');

    // Pendentes de CPF (apenas usuários na fila de migração)
    const { count: pendingCpfCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('requires_cpf', true)
      .eq('migration_status', 'pending'); // Apenas usuários em migração

    // Usuários ativos do Stripe (que ainda não migraram mas têm acesso)
    const { count: stripeActiveWaiters } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('migration_status', 'pending')
      .eq('is_paid', true);

    // =========================================================================
    // DETALHAMENTO DE PAGANTES
    // =========================================================================

    // Buscar TODOS os usuários com is_paid = true
    const { data: allPaidUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, subscription_status, created_at, admin_courtesy, grace_period_until, asaas_subscription_id, migration_status, is_paid')
      .eq('is_paid', true)
      .order('email');

    // Separar: Asaas Subscribers vs Cortesia vs Grace Period
    const asaasCustomers: any[] = [];
    const courtesyUsers: any[] = [];
    const gracePeriodUsers: any[] = [];
    const stripeMigratedActive: any[] = [];

    for (const u of allPaidUsers || []) {
      // Se é um usuário recém-migrado que ainda não caiu na rotina Asaas
      if (u.migration_status === 'pending' && u.is_paid) {
        stripeMigratedActive.push(u);
      }
      // Se tem assinatura Asaas
      else if (u.asaas_subscription_id && ['active', 'trialing'].includes(u.subscription_status || '')) {
        asaasCustomers.push(u);
      }
      // Se tem grace period
      else if (u.grace_period_until) {
        gracePeriodUsers.push(u);
      }
      // Se é cortesia
      else if (u.admin_courtesy) {
        courtesyUsers.push(u);
      }
      else {
        asaasCustomers.push(u);
      }
    }

    // =========================================================================
    // MÉTRICAS DE RECORRÊNCIA E RENOVAÇÃO (ASAAS)
    // =========================================================================
    
    // Buscar MRR da API do Asaas (fonte de verdade)
    const { AsaasService } = await import('@/lib/asaas-service');
    const asaasMetrics = await AsaasService.getFinancialMetrics();
    const mrr = asaasMetrics.mrr; // MRR real da API Asaas
    
    console.log(`[Metrics] MRR da API Asaas: R$ ${mrr.toFixed(2)}`);

    // Usuários que precisam renovar nos próximos 7 dias
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Pela fila de migração (que ainda não criaram assinatura mas estão ativos)
    const { data: renewalMigration } = await supabaseAdmin
      .from('migration_queue')
      .select('email, current_plan, next_due_date, status')
      .eq('status', 'pending')
      .lte('next_due_date', next7Days);

    // 2. Por assinaturas existentes que vencem logo
    const { data: upcomingInvoices } = await supabaseAdmin
      .from('subscriptions')
      .select('current_period_end, asaas_subscription_id, customer_id')
      .eq('status', 'active')
      .lte('current_period_end', next7Days);

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
    // CUSTOS DE IA
    // =========================================================================

    // Hoje
    const { data: todayCosts } = await supabaseAdmin
      .from('ai_usage')
      .select('cost')
      .gte('created_at', today.toISOString());

    const todayCost = todayCosts?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

    // Últimos 7 dias
    const { data: weekCosts } = await supabaseAdmin
      .from('ai_usage')
      .select('cost')
      .gte('created_at', sevenDaysAgo);

    const weekCost = weekCosts?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

    // Este mês
    const { data: monthCosts } = await supabaseAdmin
      .from('ai_usage')
      .select('cost')
      .gte('created_at', firstDayOfMonth.toISOString());

    const monthCost = monthCosts?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

    // Este ano
    const firstDayOfYear = new Date();
    firstDayOfYear.setMonth(0, 1);
    firstDayOfYear.setHours(0, 0, 0, 0);

    const { data: yearCosts } = await supabaseAdmin
      .from('ai_usage')
      .select('cost')
      .gte('created_at', firstDayOfYear.toISOString());

    const yearCost = yearCosts?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

    // Total
    const { data: allCosts } = await supabaseAdmin
      .from('ai_usage')
      .select('cost');

    const totalCost = allCosts?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;
    
    // Debug: Log AI costs para investigar valores impossíveis
    console.log(`[AI Costs Debug] Hoje: $${todayCost.toFixed(2)} (${todayCosts?.length || 0} registros)`);
    console.log(`[AI Costs Debug] Semana: $${weekCost.toFixed(2)} (${weekCosts?.length || 0} registros)`);
    console.log(`[AI Costs Debug] Mês: $${monthCost.toFixed(2)} (${monthCosts?.length || 0} registros)`);
    console.log(`[AI Costs Debug] Ano: $${yearCost.toFixed(2)} (${yearCosts?.length || 0} registros)`);
    console.log(`[AI Costs Debug] Total: $${totalCost.toFixed(2)} (${allCosts?.length || 0} registros)`);
    
    // Validação: Se hoje > total, há dados corrompidos
    if (todayCost > totalCost) {
      console.error(`[AI Costs] ERRO: Custo de hoje ($${todayCost}) > Total ($${totalCost})!`);
    }

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
        asaasTest: asaasTestRevenue,
        isSandbox: process.env.ASAAS_ENVIRONMENT === 'sandbox',
      },
      migration: {
        total: totalMigrationQueue || 0,
        migrated: migratedCount || 0,
        pendingCpf: pendingCpfCount || 0,
        pendingAsaas: stripeActiveWaiters || 0, // Usuários pagos mas ainda não no Asaas
        funnel: {
          total: totalMigrationQueue || 0,
          activeOnStripe: (migratedCount || 0) + (stripeActiveWaiters || 0),
          completed: migratedCount || 0,
        }
      },
      paymentDetails: {
        asaasCustomers: {
          count: asaasCustomers.length,
          users: asaasCustomers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            asaas_subscription_id: u.asaas_subscription_id,
            subscription_status: u.subscription_status,
            created_at: u.created_at
          })),
        },
        stripeMigrated: {
          count: stripeMigratedActive.length,
          users: stripeMigratedActive.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
          })),
        },
        courtesyUsers: {
          count: courtesyUsers.length,
          users: courtesyUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
          })),
        },
        gracePeriod: {
          total: gracePeriodUsers.length,
          users: gracePeriodUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            grace_period_until: u.grace_period_until,
          })),
        },
        recurrence: {
          mrr,
          pendingCpf: pendingCpfCount || 0,
          upcomingRenewals: [
            ...(renewalMigration || []).map(m => ({ email: m.email, plan: m.current_plan, date: m.next_due_date, type: 'migration' })),
            ...(upcomingInvoices || []).map(s => ({ id: s.asaas_subscription_id, date: s.current_period_end, type: 'subscription' }))
          ]
        }
      },
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
  } catch (error: any) {
    console.error('Erro ao buscar métricas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar métricas: ' + error.message },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
