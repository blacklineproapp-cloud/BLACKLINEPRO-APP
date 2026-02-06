import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { ClerkService } from '@/lib/clerk-service';

export const dynamic = 'force-dynamic';

/**
 * API de Status Detalhado de Migração
 * 
 * Retorna informações detalhadas de cada usuário migrado:
 * - Data de primeiro pagamento Stripe
 * - Data de migração
 * - Data de primeiro pagamento Asaas
 * - Status atual (ativo, bloqueado, pendente)
 * - Último login (Clerk)
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

    console.log('[MigrationDetailed] Buscando status detalhado de migração...');

    // =========================================================================
    // 1. BUSCAR TODOS OS USUÁRIOS DA FILA DE MIGRAÇÃO
    // =========================================================================
    const { data: migrationQueue } = await supabaseAdmin
      .from('migration_queue')
      .select('*')
      .order('email');

    if (!migrationQueue || migrationQueue.length === 0) {
      return NextResponse.json({
        total: 0,
        users: [],
        summary: {
          migrated: 0,
          pending: 0,
          withAsaasPayment: 0,
          withoutAsaasPayment: 0,
          activeInApp: 0,
        },
      });
    }

    console.log(`[MigrationDetailed] Encontrados ${migrationQueue.length} usuários na fila de migração`);

    // =========================================================================
    // 2. BUSCAR DADOS DO SUPABASE
    // =========================================================================
    const emails = migrationQueue.map(m => m.email.toLowerCase());
    
    const { data: supabaseUsers } = await supabaseAdmin
      .from('users')
      .select('email, clerk_id, is_paid, is_blocked, migration_status, asaas_subscription_id, subscription_status, plan, created_at, cpf_cnpj, requires_cpf')
      .in('email', emails);

    // =========================================================================
    // 3. BUSCAR ATIVIDADE DO CLERK
    // =========================================================================
    console.log('[MigrationDetailed] Buscando atividade do Clerk...');
    const clerkActivityMap = await ClerkService.getUsersActivityByEmails(emails);

    // =========================================================================
    // 4. BUSCAR PRIMEIRO PAGAMENTO ASAAS
    // =========================================================================
    const { data: asaasPayments } = await supabaseAdmin
      .from('payments')
      .select('customer_email, created_at, amount, status')
      .in('customer_email', emails)
      .in('status', ['succeeded', 'paid'])
      .order('created_at', { ascending: true });

    // Mapear primeiro pagamento Asaas por email
    const firstAsaasPaymentMap = new Map<string, { date: string; amount: number }>();
    asaasPayments?.forEach(payment => {
      const email = payment.customer_email.toLowerCase();
      if (!firstAsaasPaymentMap.has(email)) {
        firstAsaasPaymentMap.set(email, {
          date: payment.created_at,
          amount: Number(payment.amount),
        });
      }
    });

    // =========================================================================
    // 5. CONSOLIDAR DADOS
    // =========================================================================
    const detailedUsers = migrationQueue.map(migration => {
      const email = migration.email.toLowerCase();
      const supabaseUser = supabaseUsers?.find(u => u.email.toLowerCase() === email);
      const clerkActivity = clerkActivityMap.get(email);
      const firstAsaasPayment = firstAsaasPaymentMap.get(email);

      // Determinar status atual
      let currentStatus: 'active' | 'blocked' | 'pending' | 'migrated_no_payment' = 'pending';
      let shouldBeBlocked = false;

      if (supabaseUser) {
        if (supabaseUser.is_blocked) {
          currentStatus = 'blocked';
        } else if (supabaseUser.migration_status === 'migrated' && supabaseUser.asaas_subscription_id) {
          currentStatus = 'active';
        } else if (supabaseUser.migration_status === 'migrated' && !supabaseUser.asaas_subscription_id) {
          currentStatus = 'migrated_no_payment';
          shouldBeBlocked = true; // Migrou mas não pagou
        }
      }

      // Calcular gap entre migração e primeiro pagamento
      let migrationToPaymentGapDays: number | null = null;
      if (migration.migrated_at && firstAsaasPayment) {
        const migrationDate = new Date(migration.migrated_at);
        const paymentDate = new Date(firstAsaasPayment.date);
        migrationToPaymentGapDays = Math.floor((paymentDate.getTime() - migrationDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        email: migration.email,
        clerkId: supabaseUser?.clerk_id || null,
        
        // Datas importantes
        stripeFirstPayment: migration.stripe_first_payment_date,
        stripeLastPayment: migration.stripe_last_payment_date,
        stripeTotalPayments: migration.stripe_total_payments,
        migrationDate: migration.migrated_at,
        asaasFirstPayment: firstAsaasPayment?.date || null,
        asaasFirstPaymentAmount: firstAsaasPayment?.amount || null,
        
        // Status
        currentStatus,
        migrationStatus: migration.status,
        isPaid: supabaseUser?.is_paid || false,
        isBlocked: supabaseUser?.is_blocked || false,
        plan: migration.current_plan,
        
        // Atividade
        lastLogin: clerkActivity?.lastSignInAt || null,
        isUsingApp: clerkActivity?.isActive || false,
        
        // Validação
        shouldBeBlocked,
        hasCpf: !!supabaseUser?.cpf_cnpj,
        requiresCpf: supabaseUser?.requires_cpf || false,
        
        // Asaas
        asaasSubscriptionId: supabaseUser?.asaas_subscription_id || null,
        asaasCustomerId: migration.asaas_customer_id,
        
        // Gaps
        migrationToPaymentGapDays,
        
        // Metadata
        migrationError: migration.error_message,
      };
    });

    // =========================================================================
    // 6. ESTATÍSTICAS
    // =========================================================================
    const summary = {
      total: detailedUsers.length,
      migrated: detailedUsers.filter(u => u.migrationStatus === 'migrated').length,
      pending: detailedUsers.filter(u => u.migrationStatus === 'pending').length,
      failed: detailedUsers.filter(u => u.migrationStatus === 'failed').length,
      withAsaasPayment: detailedUsers.filter(u => u.asaasFirstPayment !== null).length,
      withoutAsaasPayment: detailedUsers.filter(u => u.migrationStatus === 'migrated' && u.asaasFirstPayment === null).length,
      activeInApp: detailedUsers.filter(u => u.isUsingApp).length,
      blocked: detailedUsers.filter(u => u.isBlocked).length,
      shouldBeBlocked: detailedUsers.filter(u => u.shouldBeBlocked).length,
      requiresCpf: detailedUsers.filter(u => u.requiresCpf).length,
      
      // Gaps médios
      avgMigrationToPaymentGap: calculateAverage(
        detailedUsers
          .filter(u => u.migrationToPaymentGapDays !== null)
          .map(u => u.migrationToPaymentGapDays!)
      ),
    };

    // =========================================================================
    // 7. ALERTAS
    // =========================================================================
    const alerts = {
      migratedButNotPaying: detailedUsers.filter(u => 
        u.migrationStatus === 'migrated' && !u.asaasFirstPayment && u.isUsingApp
      ),
      usingAppWithoutPayment: detailedUsers.filter(u => 
        u.isUsingApp && !u.isPaid && !u.isBlocked
      ),
      blockedButPaying: detailedUsers.filter(u => 
        u.isBlocked && u.isPaid
      ),
      pendingCpf: detailedUsers.filter(u => 
        u.requiresCpf && !u.hasCpf
      ),
    };

    // =========================================================================
    // RESPONSE
    // =========================================================================
    return NextResponse.json({
      total: detailedUsers.length,
      users: detailedUsers,
      summary,
      alerts: {
        migratedButNotPaying: {
          count: alerts.migratedButNotPaying.length,
          severity: 'CRITICAL',
          users: alerts.migratedButNotPaying,
        },
        usingAppWithoutPayment: {
          count: alerts.usingAppWithoutPayment.length,
          severity: 'CRITICAL',
          users: alerts.usingAppWithoutPayment,
        },
        blockedButPaying: {
          count: alerts.blockedButPaying.length,
          severity: 'HIGH',
          users: alerts.blockedButPaying,
        },
        pendingCpf: {
          count: alerts.pendingCpf.length,
          severity: 'MEDIUM',
          users: alerts.pendingCpf,
        },
      },
    });

  } catch (error: any) {
    console.error('[MigrationDetailed] Erro ao buscar status detalhado:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status detalhado: ' + error.message },
      { status: 500 }
    );
  }
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round(sum / numbers.length);
}

export const maxDuration = 60;
