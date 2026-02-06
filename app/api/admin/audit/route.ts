import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    // 1. 🔒 VERIFICAR ADMIN
    const { userId } = await auth();

    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // 2. 🔍 PARÂMETROS DE BUSCA
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Filtros opcionais
    const action = searchParams.get('action');
    const adminId = searchParams.get('adminId');

    // 3. 📊 CONSULTAR LOGS
    let query = supabaseAdmin
      .from('admin_logs')
      .select(`
        *,
        admin:admin_user_id (email, name),
        target:target_user_id (email)
      `, { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }

    if (adminId) {
      query = query.eq('admin_user_id', adminId);
    }

    // Ordenação e Paginação
    const { data: logs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. 🔍 RECONCILIAÇÃO BASEADA NO BANCO DE DADOS
    const shouldReconcile = searchParams.get('reconcile') === 'true';
    let reconciliationData = null;

    if (shouldReconcile) {
      console.log('[Audit] Iniciando reconciliação...');

      // Buscar usuários pagos do banco
      const { data: dbPaidUsers, error: dbError } = await supabaseAdmin
        .from('users')
        .select('id, email, plan, subscription_status, admin_courtesy, is_paid')
        .eq('is_paid', true);

      if (dbError) {
        console.error('[Audit] Erro ao buscar usuários pagos:', dbError);
      }

      // Buscar pagamentos confirmados
      const { data: confirmedPayments } = await supabaseAdmin
        .from('payments')
        .select('user_id, amount, status, asaas_payment_id')
        .eq('status', 'succeeded');

      const paidUserIds = new Set(confirmedPayments?.map(p => p.user_id) || []);

      // Análise de discrepâncias
      const dbOnly: any[] = [];
      const courtesyUsers: any[] = [];

      for (const u of dbPaidUsers || []) {
        if (!paidUserIds.has(u.id)) {
          if (u.admin_courtesy) {
            courtesyUsers.push({
              email: u.email,
              plan: u.plan,
              isCourtesy: true,
            });
          } else {
            dbOnly.push({
              email: u.email,
              plan: u.plan,
              isCourtesy: false,
            });
          }
        }
      }

      reconciliationData = {
        dbOnly,
        courtesyUsers,
        stats: {
          dbPaidCount: dbPaidUsers?.length || 0,
          confirmedPayments: confirmedPayments?.length || 0,
          courtesyCount: courtesyUsers.length,
        }
      };
    }

    return NextResponse.json({
      logs,
      reconciliation: reconciliationData,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Corrigir discrepâncias
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId || !(await isAdmin(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { action, email, plan } = body;

        // Buscar admin ID para logs
        const { data: adminUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .single();

        if (action === 'fix_discrepancy') {
            // Ativar usuário baseado no pagamento
            const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email).single();

            if (!user) {
                return NextResponse.json({ error: 'Usuário não encontrado no banco para ativação' }, { status: 404 });
            }

            const newPlan = plan || 'pro';
            const { activateUserAtomic } = await import('@/lib/admin/user-activation');
            const courtesyDays = body.courtesyDurationDays || 30;

            await activateUserAtomic(user.id, newPlan, {
                isPaid: true,
                adminId: adminUser?.id || undefined,
                subscriptionStatus: 'active',
                toolsUnlocked: true,
                isCourtesy: true,
                courtesyDurationDays: courtesyDays
            });

            await supabaseAdmin.from('admin_logs').insert({
                admin_user_id: adminUser?.id,
                action: 'fix_discrepancy',
                target_user_id: user.id,
                details: { issue: 'db_only', resolution: 'activated_plan', plan: newPlan }
            });

            return NextResponse.json({ success: true, message: `Usuário ${email} ativado com sucesso.` });
        }

        // MARCAR COMO BOLETO
        if (action === 'mark_as_boleto') {
            const { data: user } = await supabaseAdmin.from('users').select('id, plan').eq('email', email).single();
            if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

            await supabaseAdmin.from('users').update({
                payment_source: 'boleto',
                is_paid: true,
            }).eq('id', user.id);

            await supabaseAdmin.from('admin_logs').insert({
                admin_user_id: adminUser?.id,
                action: 'MARK_AS_BOLETO',
                target_user_id: user.id,
                details: { email, plan: user.plan, source: 'audit_reconciliation' }
            });

            return NextResponse.json({ success: true, message: `${email} marcado como pagamento por boleto.` });
        }

        // MARCAR COMO CORTESIA
        if (action === 'mark_as_courtesy') {
            const { data: user } = await supabaseAdmin.from('users').select('id, plan').eq('email', email).single();
            if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

            await supabaseAdmin.from('users').update({
                payment_source: 'courtesy',
                is_paid: true,
                admin_courtesy: true,
            }).eq('id', user.id);

            await supabaseAdmin.from('admin_logs').insert({
                admin_user_id: adminUser?.id,
                action: 'MARK_AS_COURTESY',
                target_user_id: user.id,
                details: { email, plan: user.plan, source: 'audit_reconciliation' }
            });

            return NextResponse.json({ success: true, message: `${email} marcado como cortesia.` });
        }

        // REVOGAR ACESSO
        if (action === 'revoke_access') {
            const { data: user } = await supabaseAdmin.from('users').select('id, plan').eq('email', email).single();
            if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

            const previousPlan = user.plan;

            await supabaseAdmin.from('users').update({
                plan: 'free',
                is_paid: false,
                admin_courtesy: false,
                payment_source: null,
                subscription_status: 'canceled',
                tools_unlocked: false,
            }).eq('id', user.id);

            await supabaseAdmin.from('admin_logs').insert({
                admin_user_id: adminUser?.id,
                action: 'REVOKE_ACCESS',
                target_user_id: user.id,
                details: { email, previousPlan, reason: 'audit_reconciliation_revoke' }
            });

            return NextResponse.json({ success: true, message: `Acesso de ${email} revogado. Plano alterado para FREE.` });
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
