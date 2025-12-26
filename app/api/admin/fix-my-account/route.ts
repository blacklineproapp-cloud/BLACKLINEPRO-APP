import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

/**
 * GET - Corrige sua própria conta (ativa + deleta duplicados)
 * Acesse: http://localhost:3000/api/admin/fix-my-account
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('[Fix] Corrigindo conta do usuário:', userId);

    // 1. Buscar usuário atual
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, email, clerk_id')
      .eq('clerk_id', userId)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === currentUser.email?.toLowerCase());

    if (!isAdmin) {
      return NextResponse.json({ error: 'Apenas admins podem usar este endpoint' }, { status: 403 });
    }

    console.log('[Fix] Usuário atual:', currentUser.email);

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
      console.error('[Fix] Erro ao ativar:', activateError);
      return NextResponse.json({ error: activateError.message }, { status: 500 });
    }

    console.log('[Fix] ✅ Conta ativada');

    // 3. Buscar e deletar duplicados com mesmo email (mas clerk_id diferente)
    const { data: duplicates } = await supabaseAdmin
      .from('users')
      .select('id, email, clerk_id')
      .eq('email', currentUser.email)
      .neq('clerk_id', userId);

    let deletedCount = 0;

    if (duplicates && duplicates.length > 0) {
      console.log('[Fix] Encontrados', duplicates.length, 'duplicados');

      for (const dup of duplicates) {
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', dup.id);

        if (!deleteError) {
          deletedCount++;
          console.log('[Fix] ✅ Deletado:', dup.id);
        } else {
          console.error('[Fix] Erro ao deletar:', deleteError);
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

  } catch (error: any) {
    console.error('[Fix] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
