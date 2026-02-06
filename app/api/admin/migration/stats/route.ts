/**
 * API: Estatísticas da migração Stripe → Asaas
 * GET /api/admin/migration/stats
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { StripeToAsaasMigration } from '@/lib/migration/stripe-to-asaas';
import { ADMIN_EMAILS } from '@/lib/admin-config';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('clerk_id', clerkId)
      .single();

    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar estatísticas
    const stats = await StripeToAsaasMigration.getMigrationStats();

    // Buscar itens com falha
    const { data: failedItems } = await supabaseAdmin
      .from('migration_queue')
      .select('email, error_message, updated_at')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(10);

    // Buscar últimos migrados
    const { data: recentMigrated } = await supabaseAdmin
      .from('migration_queue')
      .select('email, current_plan, migrated_at')
      .eq('status', 'migrated')
      .order('migrated_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats,
      failedItems: failedItems || [],
      recentMigrated: recentMigrated || [],
    });

  } catch (error) {
    console.error('[API] Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
