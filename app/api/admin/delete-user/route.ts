import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';


/**
 * DELETE - Deletar usuário por ID
 * Query param: ?userId=xxx
 */
export const DELETE = withAdminAuth(async (req, { userId }) => {
  const url = new URL(req.url);
  const userIdToDelete = url.searchParams.get('userId');

  if (!userIdToDelete) {
    return NextResponse.json(
      { error: 'Forneça o userId como query param' },
      { status: 400 }
    );
  }

  logger.info('[Delete] Deletando usuário', { userIdToDelete });

  // Buscar usuário antes de deletar (para log)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, clerk_id')
    .eq('id', userIdToDelete)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Buscar admin que está executando a ação
  const { data: adminUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  // Deletar
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userIdToDelete);

  if (error) {
    logger.error('[Delete] Erro ao deletar usuário', { error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Registrar ação no log de admin (para auditoria)
  if (adminUser?.id) {
    await supabaseAdmin.from('admin_logs').insert({
      admin_user_id: adminUser.id,
      action: 'delete_user',
      target_user_id: userIdToDelete,
      details: {
        deleted_email: user.email,
        deleted_clerk_id: user.clerk_id
      },
    });
  }

  logger.info('[Delete] Usuário deletado com sucesso', { email: user.email });

  return NextResponse.json({
    success: true,
    message: 'Usuário deletado com sucesso',
    deleted: {
      id: userIdToDelete,
      email: user.email,
      clerk_id: user.clerk_id
    }
  });
});
