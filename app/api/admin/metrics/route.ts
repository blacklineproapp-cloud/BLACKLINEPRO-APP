import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// Cache simples em memória para emails pagantes do Stripe
let stripePaidEmailsCache: {
  emails: Set<string>;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getStripePaidEmails(): Promise<Set<string>> {
  // Verificar cache
  if (stripePaidEmailsCache && (Date.now() - stripePaidEmailsCache.timestamp) < CACHE_TTL) {
    console.log('[Admin Metrics] 📦 Usando cache de emails Stripe');
    return stripePaidEmailsCache.emails;
  }

  console.log('[Admin Metrics] 🔍 Buscando pagamentos do Stripe (cache expirado)...');

  // Buscar do Stripe
  let charges: Stripe.Charge[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.charges.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer'],
    });

    charges = [...charges, ...response.data];
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  const successfulCharges = charges.filter(c => c.status === 'succeeded' && c.paid);

  // Coletar emails
  const paidEmailsSet = new Set<string>();

  for (const charge of successfulCharges) {
    let email = charge.billing_details?.email || charge.receipt_email || '';

    if (!email && charge.customer) {
      const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer.id;
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.deleted && customer.email) {
          email = customer.email;
        }
      } catch (e: any) {
        console.error('[Admin Metrics] Erro ao buscar customer do Stripe:', {
          customerId,
          error: e.message
        });
        // Continuar processamento mesmo com erro
      }
    }

    if (email) {
      paidEmailsSet.add(email.toLowerCase().trim());
    }
  }

  // Atualizar cache
  stripePaidEmailsCache = {
    emails: paidEmailsSet,
    timestamp: Date.now()
  };

  console.log('[Admin Metrics] 💳 Emails que pagaram via Stripe:', paidEmailsSet.size);

  return paidEmailsSet;
}

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

    // Log para debug
    console.log('[Admin Check]', { 
      clerkId: userId, 
      userEmail: user?.email, 
      error: userError?.message 
    });

    const userIsAdmin = await isAdmin(userId);
    
    if (!userIsAdmin) {
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

    // Usuários online (últimos 5 minutos baseado em last_active_at)
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
      .in('plan', ['free', 'starter', 'pro', 'studio', 'enterprise']);

    const planCounts = {
      free: 0,
      starter: 0,
      pro: 0,
      studio: 0,
      enterprise: 0,
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
    // DETALHAMENTO DE PAGANTES (STRIPE API = FONTE DA VERDADE)
    // =========================================================================

    // Buscar emails que pagaram via Stripe (com cache)
    const paidEmailsSet = await getStripePaidEmails();

    // 2. Buscar TODOS os usuários com is_paid = true no banco
    const { data: allPaidUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, subscription_id, subscription_status, created_at, admin_courtesy, grace_period_until, auto_bill_after_grace, admin_courtesy_granted_at, admin_courtesy_granted_by')
      .eq('is_paid', true)
      .order('email');

    console.log('[Admin Metrics] 📊 Total is_paid=true no banco:', allPaidUsers?.length || 0);

    // 3. Separar: Stripe vs Cortesia vs Grace Period
    const stripeCustomers: any[] = [];
    const courtesyUsers: any[] = [];
    const gracePeriodUsers: any[] = [];

    for (const user of allPaidUsers || []) {
      const emailLower = user.email?.toLowerCase().trim() || '';

      // Se pagou via Stripe (fonte da verdade!)
      if (paidEmailsSet.has(emailLower)) {
        stripeCustomers.push(user);
      }
      // Se não pagou via Stripe, pode ser cortesia ou grace period
      else {
        // Tem grace period?
        if (user.grace_period_until && user.auto_bill_after_grace) {
          gracePeriodUsers.push(user);
        }
        // Senão, é cortesia (migração ou admin)
        else {
          courtesyUsers.push(user);
        }
      }
    }

    // Filtrar grace period para quem vai receber link dia 10/01
    const usersToReceiveLink = gracePeriodUsers.filter(u => {
      if (!u.grace_period_until) return false;
      const graceDate = new Date(u.grace_period_until);
      const jan10 = new Date('2025-01-10T23:59:59Z');
      return graceDate <= jan10;
    });

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
    // CUSTOS DE IA (DIÁRIO, SEMANAL, MENSAL, ANUAL)
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

    // Total de todos os tempos
    const { data: allCosts } = await supabaseAdmin
      .from('ai_usage')
      .select('cost');

    const totalCost = allCosts?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;

    // =========================================================================
    // DEBUG: Validação de categorias
    // =========================================================================
    console.log('[Admin Metrics] ✅ Payment Categories (Stripe API as source of truth):');
    console.log('  Total is_paid=true:', allPaidUsers?.length || 0);
    console.log('  Stripe Customers (real payments):', stripeCustomers.length);
    console.log('  Courtesy (migration):', courtesyUsers.length);
    console.log('  Grace Period (all):', gracePeriodUsers.length);
    console.log('  Grace Period (to receive link Jan 10):', usersToReceiveLink.length);
    console.log('  SUM:', stripeCustomers.length + courtesyUsers.length + gracePeriodUsers.length);
    console.log('  ✅ Math check:', (stripeCustomers.length + courtesyUsers.length + gracePeriodUsers.length) === (allPaidUsers?.length || 0) ? 'OK' : 'ERROR');

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
      },
      paymentDetails: {
        stripeCustomers: {
          count: stripeCustomers.length,
          users: stripeCustomers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            subscription_id: u.subscription_id,
            subscription_status: u.subscription_status,
            created_at: u.created_at
          })),
        },
        courtesyUsers: {
          count: courtesyUsers.length,
          users: courtesyUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            admin_courtesy_granted_at: u.admin_courtesy_granted_at,
            admin_courtesy_granted_by: u.admin_courtesy_granted_by
          })),
        },
        gracePeriod: {
          total: gracePeriodUsers.length,
          toReceiveLinkJan10: usersToReceiveLink.length,
          users: usersToReceiveLink.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            grace_period_until: u.grace_period_until,
            created_at: u.created_at
          })),
        },
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

// Timeout maior porque faz chamadas ao Stripe API
export const maxDuration = 60;
