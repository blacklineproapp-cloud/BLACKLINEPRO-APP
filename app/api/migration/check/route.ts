/**
 * API: Verifica se usuário precisa fornecer CPF para migração
 * GET /api/migration/check
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/auth';
import { StripeToAsaasMigration } from '@/lib/migration/stripe-to-asaas';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar ou criar usuário (garante que existe no Supabase mesmo se webhook falhou)
    const user = await getOrCreateUser(clerkId);

    if (!user) {
      return NextResponse.json({
        needsCpf: false,
        message: 'Erro ao processar usuário',
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
