import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/auth';

/**
 * VERIFICAR STATUS DO BOOTSTRAP
 *
 * Retorna se o usuário atual é admin e se o bootstrap está disponível
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se já existe algum admin
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id, role')
      .limit(10);

    if (checkError) {
      console.error('Erro ao verificar admins:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar admins' },
        { status: 500 }
      );
    }

    const hasAdmins = existingAdmins && existingAdmins.length > 0;
    const userIsAdmin = await isAdmin(userId);

    // Buscar dados do usuário
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, clerk_id')
      .eq('clerk_id', userId)
      .single();

    return NextResponse.json({
      user: {
        clerk_id: userId,
        email: user?.email,
        isAdmin: userIsAdmin
      },
      bootstrap: {
        available: !hasAdmins, // Bootstrap só disponível se não houver admins
        adminCount: existingAdmins?.length || 0,
        admins: existingAdmins?.map(a => ({ role: a.role })) || []
      }
    });

  } catch (error: any) {
    console.error('Erro ao verificar bootstrap:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar: ' + error.message },
      { status: 500 }
    );
  }
}
