import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * GET - Corrige sua própria conta (ativa + deleta duplicados)
 * Acesse: http://localhost:3000/api/admin/fix-my-account
 */
export const GET = withAdminAuth(async (req, { userId }) => {
  logger.info('[Fix] Corrigindo conta do usuário', { userId });

  // 1. Buscar usuário atual
  const { data: currentUser } = await supabaseAdmin
    .from('users')
    .select('id, email, clerk_id')
    .eq('clerk_id', userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  logger.info('[Fix] Usuário atual', { email: currentUser.email });

  // 2. Ativar conta atual
  const { error: activateError } = await supabaseAdmin
    .from('users')
    .update({
      is_paid: true,
      subscription_status: 'active',
      tools_unlocked: true,
      plan: 'pro'
    })
    .eq('id', currentUser.id);

  if (activateError) {
    logger.error('[Fix] Erro ao ativar', { error: activateError });
    return NextResponse.json({ error: activateError.message }, { status: 500 });
  }

  logger.info('[Fix] Conta ativada', { userId });

  // 3. Buscar e deletar duplicados com mesmo email (mas clerk_id diferente)
  const { data: duplicates } = await supabaseAdmin
    .from('users')
    .select('id, email, clerk_id')
    .eq('email', currentUser.email)
    .neq('clerk_id', userId);

  let deletedCount = 0;

  if (duplicates && duplicates.length > 0) {
    logger.info('[Fix] Encontrados duplicados', { count: duplicates.length });

    for (const dup of duplicates) {
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', dup.id);

      if (!deleteError) {
        deletedCount++;
        logger.info('[Fix] Duplicado deletado', { dupId: dup.id });
      } else {
        logger.error('[Fix] Erro ao deletar duplicado', { dupId: dup.id, error: deleteError });
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Conta corrigida com sucesso!',
    user: {
      email: currentUser.email,
      activated: true,
      duplicatesDeleted: deletedCount
    }
  });
});
