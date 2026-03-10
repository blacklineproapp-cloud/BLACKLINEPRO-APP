import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteProjectObjects, userPrefix } from '@/lib/r2';
import { withAuth } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

// PATCH - Atualizar dados do projeto (nome, etc)
export const PATCH = withAuth(async (
  req,
  { userId, user },
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
  }

  // Atualizar projeto (RLS garante que só atualiza se for do usuário)
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('[Projects] Erro Supabase ao atualizar', error);
    throw error;
  }

  return NextResponse.json({ success: true, project: data });
});

// DELETE - Deletar projeto
export const DELETE = withAuth(async (
  req,
  { userId, user },
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;

  // Deletar projeto do banco
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('original_image_key, stencil_image_key, thumbnail_key')
    .single();

  if (error) {
    logger.error('[Projects] Erro Supabase ao deletar', error);
    throw error;
  }

  // Apagar objetos do R2 (silencioso se não tiver keys)
  try {
    const prefix = userPrefix(userId);
    await deleteProjectObjects(prefix, id);
  } catch (r2Error) {
    logger.warn('[R2] Erro ao apagar objetos do projeto', { error: r2Error });
  }

  return NextResponse.json({ success: true });
});
