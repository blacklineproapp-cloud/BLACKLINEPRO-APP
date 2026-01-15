import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

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

    // 4. 🔍 RECONCILIAÇÃO STRIPE (Se solicitado via flag 'reconcile=true')
    // Isso evita lentidão na listagem padrão de logs
    const shouldReconcile = searchParams.get('reconcile') === 'true';
    let reconciliationData = null;

    if (shouldReconcile) {
      console.log('[Audit] Iniciando reconciliação Stripe...'); // LOG OBRIGATÓRIO
      
      // Buscar do Stripe (lógica simplificada para performance, idealment usar paginação completa em background)
      // Buscando últimas 100 cobranças de sucesso para análise rápida
      const charges = await stripe.charges.list({
        limit: 100,
        expand: ['data.customer'],
      });

      const successfulCharges = charges.data.filter(c => c.status === 'succeeded' && c.paid);
      
      // Agrupar por email e analisar valores
      const chargesByEmail = new Map<string, number>();
      const emailToChargeIds = new Map<string, string[]>();
      const emailToLastAmount = new Map<string, number>();

      for (const charge of successfulCharges) {
        let email = charge.billing_details?.email || charge.receipt_email || '';
        
        if (!email && charge.customer && typeof charge.customer !== 'string' && !charge.customer.deleted) {
            email = charge.customer.email || '';
        }

        if (email) {
          email = email.toLowerCase().trim();
          chargesByEmail.set(email, (chargesByEmail.get(email) || 0) + 1);
          
          const ids = emailToChargeIds.get(email) || [];
          ids.push(charge.id);
          emailToChargeIds.set(email, ids);

          // Guardar o maior valor pago (assumindo upgrade ou plano mais alto)
          const currentMax = emailToLastAmount.get(email) || 0;
          if (charge.amount > currentMax) {
              emailToLastAmount.set(email, charge.amount);
          }
        }
      }

      // Comparar com Banco
      const { data: dbPaidUsers } = await supabaseAdmin
        .from('users')
        .select('email, plan, subscription_status')
        .eq('is_paid', true);
      
      const dbPaidEmails = new Set(dbPaidUsers?.map(u => u.email.toLowerCase().trim()) || []);

      // Discrepâncias
      const stripeOnly: any[] = [];
      const dbOnly: any[] = [];
      const multiPayers: any[] = [];

      // Helper para adivinhar plano pelo valor (em centavos)
      const guessPlan = (amount: number) => {
          if (amount < 6000) return 'starter'; // ~R$ 50,00
          if (amount < 15000) return 'pro';     // ~R$ 100,00
          return 'studio';                      // > R$ 150,00
      };

      // 1. Stripe Only (Pagou mas não tá ativo)
      for (const email of chargesByEmail.keys()) {
          if (!dbPaidEmails.has(email)) {
              const amount = emailToLastAmount.get(email) || 0;
              stripeOnly.push({
                  email,
                  count: chargesByEmail.get(email),
                  chargeIds: emailToChargeIds.get(email),
                  suggestedPlan: guessPlan(amount),
                  lastAmount: amount
              });
          }
           // 3. Multi Payers
           if ((chargesByEmail.get(email) || 0) > 1) {
              multiPayers.push({
                  email,
                  count: chargesByEmail.get(email)
              });
           }
      }

      // 2. DB Only (Ativo sem match recente no Stripe)
      // Nota: Isso pode incluir boletos manuais legítimos, marcar como "Warning"
      for (const u of dbPaidUsers || []) {
          if (u.email && !chargesByEmail.has(u.email.toLowerCase().trim())) {
              dbOnly.push({
                  email: u.email,
                  plan: u.plan
              });
          }
      }

      reconciliationData = {
          stripeOnly,
          dbOnly,
          multiPayers,
          stats: {
              processedCharges: successfulCharges.length,
              uniquePayers: chargesByEmail.size,
              dbPaidCount: dbPaidUsers?.length || 0
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

        if (action === 'fix_stripe_only') {
            // Ativar usuário baseado no pagamento Stripe
            // Buscar usuário pelo email
            const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
            
            if (!user) {
                return NextResponse.json({ error: 'Usuário não encontrado no banco para ativação' }, { status: 404 });
            }

            // Ativar como Pro (ou plano padrao)
            const newPlan = plan || 'pro';
             
            // Importar função atômica (gambiarra para não importar em cima se não usado)
            const { activateUserAtomic } = await import('@/lib/admin/user-activation');
            
            const courtesyDays = body.courtesyDurationDays || 30;

            await activateUserAtomic(user.id, newPlan, {
                isPaid: true,
                adminId: userId, // ID CLERK do admin
                subscriptionStatus: 'active',
                toolsUnlocked: true,
                isCourtesy: true,
                courtesyDurationDays: courtesyDays
            });

            // Logar ação
            await supabaseAdmin.from('admin_logs').insert({
                admin_user_id: (await supabaseAdmin.from('users').select('id').eq('clerk_id', userId).single()).data?.id,
                action: 'fix_discrepancy',
                target_user_id: user.id,
                details: { issue: 'stripe_only', resolution: 'activated_plan', plan: newPlan }
            });

            return NextResponse.json({ success: true, message: `Usuário ${email} ativado com sucesso.` });
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

