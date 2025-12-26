import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

async function isAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('clerk_id', userId)
    .single();

  const userEmailLower = user?.email?.toLowerCase() || '';
  return user ? ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower) : false;
}

/**
 * DELETE - Deletar usuário por ID
 * Query param: ?userId=xxx
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const url = new URL(req.url);
    const userIdToDelete = url.searchParams.get('userId');

    if (!userIdToDelete) {
      return NextResponse.json(
        { error: 'Forneça o userId como query param' },
        { status: 400 }
      );
    }

    console.log('[Delete] Deletando usuário:', userIdToDelete);

    // Buscar usuário antes de deletar (para log)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, clerk_id')
      .eq('id', userIdToDelete)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Deletar
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userIdToDelete);

    if (error) {
      console.error('[Delete] Erro:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Delete] ✅ Usuário deletado:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Usuário deletado com sucesso',
      deleted: {
        id: userIdToDelete,
        email: user.email,
        clerk_id: user.clerk_id
      }
    });

  } catch (error: any) {
    console.error('[Delete] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
