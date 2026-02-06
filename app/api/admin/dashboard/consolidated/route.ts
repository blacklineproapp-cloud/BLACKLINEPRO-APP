import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { ClerkService } from '@/lib/clerk-service';

export const dynamic = 'force-dynamic';

/**
 * API de Dashboard Consolidado
 * 
 * Integra dados de:
 * - Clerk (métricas de usuários, login, retenção)
 * - Supabase (dados de pagamento, status)
 * - Asaas (assinaturas ativas)
 * - Stripe (histórico de pagamentos)
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // =========================================================================
    // 1. MÉTRICAS DO CLERK
    // =========================================================================
    console.log('[Consolidated] Buscando métricas do Clerk...');
    let clerkMetrics;
    try {
      clerkMetrics = await ClerkService.getUserMetrics();
      console.log(`[Consolidated] Clerk: ${clerkMetrics.totalUsers} usuários, ${clerkMetrics.activeUsers} ativos`);
    } catch (error) {
      console.error('[Consolidated] Erro ao buscar métricas do Clerk:', error);
      // Fallback: usar valores padrão
      clerkMetrics = {
        totalUsers: 0,
        activeUsers: 0,
        lastWeekLogins: 0,
        lastMonthLogins: 0,
        retention: { day1: 0, day7: 0, day30: 0 },
      };
    }

    // =========================================================================
    // 2. DADOS DE PAGAMENTO - STRIPE (HISTÓRICO)
    // =========================================================================
    console.log('[Consolidated] Processando dados Stripe...');
    const stripeHistoricalRevenue = 7025.00; // Valor confirmado do histórico
    
    const { data: migrationQueue } = await supabaseAdmin
      .from('migration_queue')
      .select('email, stripe_first_payment_date, stripe_last_payment_date, stripe_total_payments, current_plan')
      .eq('status', 'pending');

    const stripeUsers = migrationQueue || [];

    // =========================================================================
    // 3. DADOS DE PAGAMENTO - ASAAS (ATIVO) - DIRETO DA API
    // =========================================================================
    console.log('[Consolidated] Buscando dados REAIS do Asaas via API...');
    
    // Importar serviço Asaas
    const { AsaasService } = await import('@/lib/asaas-service');
    
    // Buscar métricas financeiras reais da API do Asaas
    const asaasMetrics = await AsaasService.getFinancialMetrics();
    
    console.log(`[Consolidated] Asaas API: ${asaasMetrics.subscriptions.active} assinaturas ativas`);
    console.log(`[Consolidated] Asaas API: R$ ${asaasMetrics.payments.receivedValue.toFixed(2)} recebido`);
    console.log(`[Consolidated] Asaas API: MRR R$ ${asaasMetrics.mrr.toFixed(2)}`);

    // Buscar usuários do Supabase para correlacionar com dados do Asaas
    const { data: allPaidUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, subscription_status, asaas_subscription_id, migration_status, is_paid, admin_courtesy, grace_period_until')
      .eq('is_paid', true);

    console.log(`[Consolidated] Usuários pagantes no Supabase: ${allPaidUsers?.length || 0}`);

    // Separar usuários (para estatísticas adicionais)
    const asaasUsers: any[] = [];
    const stripeMigratedActive: any[] = [];
    const courtesyUsers: any[] = [];
    const gracePeriodUsers: any[] = [];

    for (const u of allPaidUsers || []) {
      if (u.migration_status === 'pending' && u.is_paid) {
        stripeMigratedActive.push(u);
      }
      else if (u.asaas_subscription_id && ['active', 'trialing'].includes(u.subscription_status || '')) {
        asaasUsers.push(u);
      }
      else if (u.grace_period_until) {
        gracePeriodUsers.push(u);
      }
      else if (u.admin_courtesy) {
        courtesyUsers.push(u);
      }
      else {
        asaasUsers.push(u);
      }
    }

    console.log(`[Consolidated] Usuários Asaas no Supabase: ${asaasUsers.length}`);

    // =========================================================================
    // 4. STATUS DE MIGRAÇÃO
    // =========================================================================
    console.log('[Consolidated] Analisando status de migração...');
    const { count: totalMigration } = await supabaseAdmin
      .from('migration_queue')
      .select('*', { count: 'exact', head: true });

    const { count: migratedCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('migration_status', 'migrated');

    const { count: pendingCpf } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('requires_cpf', true);

    // Usuários migrados COM pagamento Asaas
    const { count: migratedWithPayment } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('migration_status', 'migrated')
      .eq('is_paid', true)
      .not('asaas_subscription_id', 'is', null);

    // Usuários migrados SEM pagamento Asaas
    const { count: migratedWithoutPayment } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('migration_status', 'migrated')
      .or('is_paid.eq.false,asaas_subscription_id.is.null');

    // Usuários bloqueados
    const { count: blockedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_blocked', true);

    // =========================================================================
    // 5. VALIDAÇÃO PRELIMINAR
    // =========================================================================
    console.log('[Consolidated] Executando validação preliminar...');
    
    // Buscar usuários que estão usando o app (Clerk) mas não têm pagamento (Supabase)
    const allClerkUsers = await ClerkService.getAllUsersActivity();
    const clerkEmails = allClerkUsers.map(u => u.email.toLowerCase());

    const { data: supabaseUsers } = await supabaseAdmin
      .from('users')
      .select('email, is_paid, is_blocked, migration_status, admin_courtesy, grace_period_until')
      .in('email', clerkEmails);

    const usersUsingAppWithoutPayment = [];
    const usersBlockedIncorrectly = [];

    for (const clerkUser of allClerkUsers) {
      const supabaseUser = supabaseUsers?.find(u => u.email.toLowerCase() === clerkUser.email.toLowerCase());
      
      if (!supabaseUser) continue;

      const now = new Date();
      const hasGracePeriod = supabaseUser.grace_period_until && new Date(supabaseUser.grace_period_until) > now;
      const hasCourtesy = supabaseUser.admin_courtesy;
      const shouldHaveAccess = supabaseUser.is_paid || hasGracePeriod || hasCourtesy;

      // Usuário usando app SEM pagamento e SEM grace/courtesy
      if (clerkUser.isActive && !shouldHaveAccess && !supabaseUser.is_blocked) {
        usersUsingAppWithoutPayment.push({
          email: clerkUser.email,
          lastLogin: clerkUser.lastSignInAt,
          isPaid: supabaseUser.is_paid,
          isBlocked: supabaseUser.is_blocked,
        });
      }

      // Usuário bloqueado mas DEVERIA ter acesso
      if (supabaseUser.is_blocked && shouldHaveAccess) {
        usersBlockedIncorrectly.push({
          email: clerkUser.email,
          isPaid: supabaseUser.is_paid,
          hasGracePeriod,
          hasCourtesy,
        });
      }
    }

    // =========================================================================
    // RESPONSE CONSOLIDADO
    // =========================================================================
    return NextResponse.json({
      clerk: {
        totalUsers: clerkMetrics.totalUsers,
        activeUsers: clerkMetrics.activeUsers,
        lastWeekLogins: clerkMetrics.lastWeekLogins,
        lastMonthLogins: clerkMetrics.lastMonthLogins,
        retention: clerkMetrics.retention,
      },
      payments: {
        stripe: {
          totalHistorical: stripeHistoricalRevenue,
          users: stripeUsers.length,
          userList: stripeUsers.slice(0, 10), // Primeiros 10 para preview
        },
        asaas: {
          activeSubscriptions: asaasMetrics.subscriptions.active, // Dados reais da API Asaas
          mrr: asaasMetrics.mrr, // MRR real da API Asaas
          totalRevenue: asaasMetrics.payments.receivedValue, // Receita real recebida
          users: asaasUsers.length, // Usuários no Supabase com assinatura
          userList: asaasUsers.slice(0, 10) || [], // Primeiros 10 para preview
        },
      },
      migration: {
        total: totalMigration || 0,
        migrated: migratedCount || 0,
        withPayment: migratedWithPayment || 0,
        withoutPayment: migratedWithoutPayment || 0,
        pendingCpf: pendingCpf || 0,
        blocked: blockedUsers || 0,
      },
      validation: {
        usersUsingAppWithoutPayment: usersUsingAppWithoutPayment.length,
        usersBlockedIncorrectly: usersBlockedIncorrectly.length,
        criticalIssues: usersUsingAppWithoutPayment.length + usersBlockedIncorrectly.length,
      },
      summary: {
        revenue: {
          stripe: {
            historical: stripeHistoricalRevenue,  // R$ 7.025 (histórico total)
            period: "Histórico (Stripe)",
            users: stripeUsers.length
          },
          asaas: {
            received: asaasMetrics.payments.receivedValue,  // Já recebido no Asaas
            mrr: asaasMetrics.mrr,  // MRR atual (projeção mensal)
            projected: asaasMetrics.mrr,  // Projeção próximo mês
            period: "Atual (Asaas)",
            users: asaasUsers.length,
            activeSubscriptions: asaasMetrics.subscriptions.active
          },
          combined: {
            total: stripeHistoricalRevenue + asaasMetrics.payments.receivedValue,
            note: "Stripe histórico + Asaas recebido até agora"
          }
        },
        totalPaidUsers: asaasUsers.length + stripeUsers.length,
        conversionRate: ((clerkMetrics.totalUsers > 0 ? asaasUsers.length / clerkMetrics.totalUsers : 0) * 100).toFixed(2),
      },
    });

  } catch (error: any) {
    console.error('[Consolidated] Erro ao buscar dados consolidados:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados consolidados: ' + error.message },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
