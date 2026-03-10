import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasAdminService } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  // Fetch active subscriptions from Asaas
  const subscriptions = await AsaasAdminService.getActiveSubscriptions();

  // Get customer IDs to enrich with user data
  const customerIds = subscriptions.map((s) => s.customer);

  // Fetch users with matching asaas_customer_id
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('email, name, plan, asaas_customer_id')
    .in('asaas_customer_id', customerIds);

  const userMap = new Map(
    (users || []).map((u) => [u.asaas_customer_id, u])
  );

  const enriched = subscriptions.map((sub) => {
    const user = userMap.get(sub.customer);
    return {
      id: sub.id,
      customer: sub.customer,
      billingType: sub.billingType,
      value: sub.value,
      nextDueDate: sub.nextDueDate,
      cycle: sub.cycle,
      status: sub.status,
      description: sub.description,
      user: user
        ? { email: user.email, name: user.name, plan: user.plan }
        : null,
    };
  });

  return NextResponse.json({ subscriptions: enriched });
});
