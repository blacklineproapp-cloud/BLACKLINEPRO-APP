import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { ClerkService } from '@/lib/clerk-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * API de Validação de Controle de Acesso
 *
 * Valida se o sistema de bloqueio está funcionando corretamente:
 * 1. Usuários usando app SEM pagamento
 * 2. Usuários bloqueados INCORRETAMENTE
 * 3. Discrepâncias entre Clerk e Supabase
 */
export const GET = withAdminAuth(async () => {
  logger.info('[AccessControl] Iniciando validação de controle de acesso');

  // =========================================================================
  // 1. BUSCAR TODOS OS USUARIOS DO CLERK
  // =========================================================================
  const allClerkUsers = await ClerkService.getAllUsersActivity();
  logger.info('[AccessControl] Usuários encontrados no Clerk', { count: allClerkUsers.length });

  const clerkEmails = allClerkUsers.map(u => u.email.toLowerCase());

  // =========================================================================
  // 2. BUSCAR DADOS DO SUPABASE
  // =========================================================================
  const { data: supabaseUsers } = await supabaseAdmin
    .from('users')
    .select('email, clerk_id, is_paid, is_blocked, migration_status, admin_courtesy, grace_period_until, asaas_subscription_id, subscription_status, plan, created_at')
    .in('email', clerkEmails);

  logger.info('[AccessControl] Usuários encontrados no Supabase', { count: supabaseUsers?.length || 0 });

  // =========================================================================
  // 3. VALIDACOES
  // =========================================================================
  const now = new Date();

  const usersUsingAppWithoutPayment: any[] = [];
  const usersBlockedIncorrectly: any[] = [];
  const discrepancies: any[] = [];
  const migratedWithoutAsaasPayment: any[] = [];

  for (const clerkUser of allClerkUsers) {
    const supabaseUser = supabaseUsers?.find(u => u.email.toLowerCase() === clerkUser.email.toLowerCase());

    // Discrepância: Usuário no Clerk mas não no Supabase
    if (!supabaseUser) {
      discrepancies.push({
        email: clerkUser.email,
        issue: 'Usuário existe no Clerk mas não no Supabase',
        clerkId: clerkUser.userId,
        lastLogin: clerkUser.lastSignInAt,
      });
      continue;
    }

    // Verificar se tem grace period ou cortesia
    const hasGracePeriod = supabaseUser.grace_period_until && new Date(supabaseUser.grace_period_until) > now;
    const hasCourtesy = supabaseUser.admin_courtesy;
    const shouldHaveAccess = supabaseUser.is_paid || hasGracePeriod || hasCourtesy;

    // PROBLEMA 1: Usuário ATIVO no app SEM pagamento e SEM grace/courtesy
    if (clerkUser.isActive && !shouldHaveAccess && !supabaseUser.is_blocked) {
      usersUsingAppWithoutPayment.push({
        email: clerkUser.email,
        lastLogin: clerkUser.lastSignInAt,
        isPaid: supabaseUser.is_paid,
        isBlocked: supabaseUser.is_blocked,
        plan: supabaseUser.plan,
        migrationStatus: supabaseUser.migration_status,
        asaasSubscriptionId: supabaseUser.asaas_subscription_id,
        severity: 'CRITICAL',
      });
    }

    // PROBLEMA 2: Usuário bloqueado mas DEVERIA ter acesso
    if (supabaseUser.is_blocked && shouldHaveAccess) {
      usersBlockedIncorrectly.push({
        email: clerkUser.email,
        isPaid: supabaseUser.is_paid,
        hasGracePeriod,
        hasCourtesy,
        gracePeriodUntil: supabaseUser.grace_period_until,
        plan: supabaseUser.plan,
        severity: 'HIGH',
      });
    }

    // PROBLEMA 3: Usuário migrado SEM pagamento Asaas
    if (supabaseUser.migration_status === 'migrated' && !supabaseUser.asaas_subscription_id && !hasGracePeriod && !hasCourtesy) {
      migratedWithoutAsaasPayment.push({
        email: clerkUser.email,
        lastLogin: clerkUser.lastSignInAt,
        isActive: clerkUser.isActive,
        isPaid: supabaseUser.is_paid,
        isBlocked: supabaseUser.is_blocked,
        plan: supabaseUser.plan,
        severity: 'HIGH',
      });
    }
  }

  // =========================================================================
  // 4. BUSCAR USUARIOS NO SUPABASE MAS NAO NO CLERK
  // =========================================================================
  const { data: allSupabaseUsers } = await supabaseAdmin
    .from('users')
    .select('email, clerk_id');

  const supabaseEmails = allSupabaseUsers?.map(u => u.email.toLowerCase()) || [];
  const usersInSupabaseNotInClerk = supabaseEmails.filter(email => !clerkEmails.includes(email));

  logger.info('[AccessControl] Usuários no Supabase mas não no Clerk', { count: usersInSupabaseNotInClerk.length });

  // =========================================================================
  // 5. ESTATISTICAS
  // =========================================================================
  const stats = {
    totalClerkUsers: allClerkUsers.length,
    totalSupabaseUsers: supabaseUsers?.length || 0,
    activeClerkUsers: allClerkUsers.filter(u => u.isActive).length,
    paidSupabaseUsers: supabaseUsers?.filter(u => u.is_paid).length || 0,
    blockedSupabaseUsers: supabaseUsers?.filter(u => u.is_blocked).length || 0,
  };

  // =========================================================================
  // RESPONSE
  // =========================================================================
  return NextResponse.json({
    stats,
    issues: {
      usersUsingAppWithoutPayment: {
        count: usersUsingAppWithoutPayment.length,
        severity: 'CRITICAL',
        description: 'Usuários ativos no app sem pagamento, grace period ou cortesia',
        users: usersUsingAppWithoutPayment,
      },
      usersBlockedIncorrectly: {
        count: usersBlockedIncorrectly.length,
        severity: 'HIGH',
        description: 'Usuários bloqueados mas que deveriam ter acesso (pagantes, grace, cortesia)',
        users: usersBlockedIncorrectly,
      },
      migratedWithoutAsaasPayment: {
        count: migratedWithoutAsaasPayment.length,
        severity: 'HIGH',
        description: 'Usuários migrados sem assinatura Asaas ativa',
        users: migratedWithoutAsaasPayment,
      },
      discrepancies: {
        count: discrepancies.length,
        severity: 'MEDIUM',
        description: 'Usuários no Clerk mas não no Supabase',
        users: discrepancies,
      },
      usersInSupabaseNotInClerk: {
        count: usersInSupabaseNotInClerk.length,
        severity: 'LOW',
        description: 'Usuários no Supabase mas não no Clerk (contas deletadas?)',
      },
    },
    summary: {
      totalIssues: usersUsingAppWithoutPayment.length + usersBlockedIncorrectly.length + migratedWithoutAsaasPayment.length + discrepancies.length,
      criticalIssues: usersUsingAppWithoutPayment.length,
      highPriorityIssues: usersBlockedIncorrectly.length + migratedWithoutAsaasPayment.length,
      systemHealthScore: calculateHealthScore(
        usersUsingAppWithoutPayment.length,
        usersBlockedIncorrectly.length,
        migratedWithoutAsaasPayment.length,
        stats.totalClerkUsers
      ),
    },
  });
});

/**
 * Calcula um score de saúde do sistema (0-100)
 */
function calculateHealthScore(
  criticalIssues: number,
  highIssues: number,
  mediumIssues: number,
  totalUsers: number
): number {
  if (totalUsers === 0) return 100;

  const criticalWeight = 10;
  const highWeight = 5;
  const mediumWeight = 2;

  const totalPenalty = (criticalIssues * criticalWeight) + (highIssues * highWeight) + (mediumIssues * mediumWeight);
  const maxPenalty = totalUsers * criticalWeight;

  const score = Math.max(0, 100 - (totalPenalty / maxPenalty) * 100);
  return Math.round(score);
}

export const maxDuration = 60;
