/**
 * API: Estatísticas da migração Stripe -> Asaas
 * GET /api/admin/migration/stats
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { StripeToAsaasMigration } from '@/lib/migration/stripe-to-asaas';

export const GET = withAdminAuth(async (req, { userId, adminId, adminEmail }) => {
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
});
