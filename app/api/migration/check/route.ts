/**
 * API: Verifica se usuário precisa fornecer CPF para migração
 * GET /api/migration/check
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { StripeToAsaasMigration } from '@/lib/migration/stripe-to-asaas';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar usuário no banco
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name, requires_cpf, migration_status, plan')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({
        needsCpf: false,
        message: 'Usuário não encontrado',
      });
    }

    // Verificar se precisa de CPF
    const result = await StripeToAsaasMigration.checkUserNeedsCpf(user.id);

    return NextResponse.json({
      needsCpf: result.needsCpf,
      currentPlan: result.currentPlan,
      migrationItem: result.migrationItem ? {
        plan: result.migrationItem.current_plan,
        billingDay: result.migrationItem.billing_day,
        migrationType: result.migrationItem.migration_type,
        isCourtesy: result.migrationItem.is_courtesy,
      } : null,
    });

  } catch (error) {
    console.error('[API] Erro ao verificar migração:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
