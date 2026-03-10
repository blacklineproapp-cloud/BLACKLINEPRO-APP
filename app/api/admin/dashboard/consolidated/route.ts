import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ClerkService } from '@/lib/clerk-service';
import { logger } from '@/lib/logger';

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
export const GET = withAdminAuth(async (req, { adminId }) => {
    // =========================================================================
    // 1. MÉTRICAS DO CLERK
    // =========================================================================
    logger.info('[Consolidated] Buscando métricas do Clerk');
    let clerkMetrics;
    try {
      clerkMetrics = await ClerkService.getUserMetrics();
      logger.info('[Consolidated] Clerk metrics fetched', { totalUsers: clerkMetrics.totalUsers, activeUsers: clerkMetrics.activeUsers });
    } catch (error) {
      logger.error('[Consolidated] Erro ao buscar métricas do Clerk', { error });
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
    logger.info('[Consolidated] Processando dados Stripe');
    const stripeHistoricalRevenue = 7025.00; // Valor confirmado do histórico

    const { data: migrationQueue } = await supabaseAdmin
      .from('migration_queue')
      .select('email, stripe_first_payment_date, stripe_last_payment_date, stripe_total_payments, current_plan')
      .eq('status', 'pending');

    const stripeUsers = migrationQueue || [];

    // =========================================================================
    // 3. DADOS DE PAGAMENTO - ASAAS (ATIVO) - DIRETO DA API
    // =========================================================================
    logger.info('[Consolidated] Buscando dados REAIS do Asaas via API');

    // Importar serviço Asaas
    const { AsaasAdminService } = await import('@/lib/asaas');

    // Buscar métricas financeiras reais da API do Asaas
    const asaasMetrics = await AsaasAdminService.getFinancialMetrics();

    logger.info('[Consolidated] Asaas API metrics', { activeSubscriptions: asaasMetrics.subscriptions.active, receivedValue: asaasMetrics.payments.receivedValue, mrr: asaasMetrics.mrr });

    // Buscar usuários do Supabase para correlacionar com dados do Asaas
    const { data: allPaidUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, subscription_status, asaas_subscription_id, migration_status, is_paid, admin_courtesy, grace_period_until')
      .eq('is_paid', true);

    logger.info('[Consolidated] Usuários pagantes no Supabase', { count: allPaidUsers?.length || 0 });

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

    logger.info('[Consolidated] Usuários Asaas no Supabase', { count: asaasUsers.length });

    // =========================================================================
    // 4. STATUS DE MIGRAÇÃO
    // =========================================================================
    logger.info('[Consolidated] Analisando status de migração');
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
    logger.info('[Consolidated] Executando validação preliminar');

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
});

export const maxDuration = 60;
