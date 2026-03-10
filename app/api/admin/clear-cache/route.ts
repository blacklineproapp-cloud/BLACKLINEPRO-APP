import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { invalidateCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * Limpa cache de admin para o usuário atual
 * Útil após se tornar admin via SQL
 * RESTRITO: Apenas admins podem usar
 */
export const POST = withAdminAuth(async (req, { adminId }) => {
    // Invalidar cache de admin
    await invalidateCache(`admin:${adminId}`);

    logger.info('[Clear Cache] Cache de admin limpo', { adminId });

    return NextResponse.json({
      success: true,
      message: 'Cache limpo com sucesso. Tente acessar /admin novamente.',
      userId: adminId
    });
});
