import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { AsaasService } from '@/lib/asaas-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Fetch active subscriptions from Asaas
    const subscriptions = await AsaasService.getActiveSubscriptions();

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
  } catch (error: any) {
    console.error('[Admin Subscriptions] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar assinaturas' },
      { status: 500 }
    );
  }
}
