import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * DEBUG: Analisar categorias de pagantes
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Buscar TODOS os usuários com is_paid = true
    const { data: allPaidUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, plan, is_paid, subscription_id, subscription_status, admin_courtesy, grace_period_until, auto_bill_after_grace')
      .eq('is_paid', true);

    // Categorizar cada um
    const categories = {
      stripeActive: [] as any[],
      stripeInactive: [] as any[],
      courtesyPermanent: [] as any[],
      gracePeriod: [] as any[],
      unknown: [] as any[]
    };

    allPaidUsers?.forEach(user => {
      // 1. Tem subscription do Stripe?
      if (user.subscription_id) {
        if (user.subscription_status === 'active') {
          categories.stripeActive.push(user);
        } else {
          categories.stripeInactive.push(user);
        }
      }
      // 2. É cortesia permanente?
      else if (user.admin_courtesy === true) {
        categories.courtesyPermanent.push(user);
      }
      // 3. Está em grace period?
      else if (user.grace_period_until) {
        categories.gracePeriod.push(user);
      }
      // 4. Não se encaixa em nenhuma categoria?
      else {
        categories.unknown.push(user);
      }
    });

    return NextResponse.json({
      total: allPaidUsers?.length || 0,
      breakdown: {
        stripeActive: {
          count: categories.stripeActive.length,
          users: categories.stripeActive.map(u => ({ email: u.email, plan: u.plan, subscription_status: u.subscription_status }))
        },
        stripeInactive: {
          count: categories.stripeInactive.length,
          users: categories.stripeInactive.map(u => ({ email: u.email, plan: u.plan, subscription_status: u.subscription_status }))
        },
        courtesyPermanent: {
          count: categories.courtesyPermanent.length,
          users: categories.courtesyPermanent.map(u => ({ email: u.email, plan: u.plan, admin_courtesy: u.admin_courtesy }))
        },
        gracePeriod: {
          count: categories.gracePeriod.length,
          users: categories.gracePeriod.map(u => ({ email: u.email, plan: u.plan, grace_period_until: u.grace_period_until }))
        },
        unknown: {
          count: categories.unknown.length,
          users: categories.unknown.map(u => ({ email: u.email, plan: u.plan, is_paid: u.is_paid }))
        }
      },
      validation: {
        sum: categories.stripeActive.length +
             categories.stripeInactive.length +
             categories.courtesyPermanent.length +
             categories.gracePeriod.length +
             categories.unknown.length,
        shouldEqual: allPaidUsers?.length || 0
      }
    });

  } catch (error: any) {
    console.error('[Debug Payments] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
