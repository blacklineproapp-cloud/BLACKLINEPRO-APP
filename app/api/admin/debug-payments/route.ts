import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * DEBUG: Analisar categorias de pagantes
 */
export const GET = withAdminAuth(async () => {
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
    if (user.subscription_id) {
      if (user.subscription_status === 'active') {
        categories.stripeActive.push(user);
      } else {
        categories.stripeInactive.push(user);
      }
    }
    else if (user.admin_courtesy === true) {
      categories.courtesyPermanent.push(user);
    }
    else if (user.grace_period_until) {
      categories.gracePeriod.push(user);
    }
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
});
