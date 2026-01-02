import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { invalidateCache } from '@/lib/cache';
import { isAdmin } from '@/lib/auth';

/**
 * Limpa cache de admin para o usuário atual
 * Útil após se tornar admin via SQL
 * RESTRITO: Apenas admins podem usar
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🔒 SEGURANÇA: Verificar se é admin
    if (!await isAdmin(userId)) {
      console.warn(`[Clear Cache] ⚠️ Tentativa de acesso negada: ${userId}`);
      return NextResponse.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 });
    }

    // Invalidar cache de admin
    await invalidateCache(`admin:${userId}`);

    console.log('[Clear Cache] ✅ Cache de admin limpo para:', userId);

    return NextResponse.json({
      success: true,
      message: 'Cache limpo com sucesso. Tente acessar /admin novamente.',
      userId
    });

  } catch (error: any) {
    console.error('[Clear Cache] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
