import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * VERIFICAR STATUS DO BOOTSTRAP
 *
 * Retorna se o usuário atual é admin e se o bootstrap está disponível
 */
export const GET = withAdminAuth(async (req, { userId, adminId, adminEmail }) => {
    // Verificar se já existe algum admin
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id, role')
      .limit(10);

    if (checkError) {
      logger.error('[Bootstrap] Erro ao verificar admins', { error: checkError });
      return NextResponse.json(
        { error: 'Erro ao verificar admins' },
        { status: 500 }
      );
    }

    const hasAdmins = existingAdmins && existingAdmins.length > 0;

    return NextResponse.json({
      user: {
        clerk_id: userId,
        email: adminEmail,
        isAdmin: true
      },
      bootstrap: {
        available: !hasAdmins, // Bootstrap só disponível se não houver admins
        adminCount: existingAdmins?.length || 0,
        admins: existingAdmins?.map(a => ({ role: a.role })) || []
      }
    });
});
