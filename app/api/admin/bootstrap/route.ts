import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * ENDPOINT DE BOOTSTRAP - CRIAR PRIMEIRO ADMIN
 *
 * Este endpoint permite criar o primeiro admin do sistema.
 * Por segurança, ele só funciona se NÃO existir nenhum admin na tabela admin_users.
 *
 * Após criar o primeiro admin, este endpoint se auto-desabilita.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Verificar se já existe algum admin
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('Erro ao verificar admins existentes:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar admins existentes' },
        { status: 500 }
      );
    }

    // 2. Se já existir pelo menos 1 admin, bloquear
    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        {
          error: 'Bootstrap bloqueado',
          message: 'Já existe um ou mais administradores no sistema. Entre em contato com um admin existente para obter permissões.',
          blocked: true
        },
        { status: 403 }
      );
    }

    // 3. Buscar dados do usuário atual no Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, clerk_id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      console.error('Usuário não encontrado:', userError);
      return NextResponse.json(
        { error: 'Usuário não encontrado no sistema' },
        { status: 404 }
      );
    }

    // 4. Criar admin (superadmin permanente)
    const { data: newAdmin, error: insertError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        user_id: user.clerk_id,
        role: 'superadmin',
        granted_by: null, // Bootstrap - ninguém concedeu
        granted_at: new Date().toISOString(),
        expires_at: null, // Permanente
        notes: 'Primeiro admin criado via bootstrap'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar admin:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar admin: ' + insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ PRIMEIRO ADMIN CRIADO:', {
      email: user.email,
      clerk_id: user.clerk_id,
      role: 'superadmin'
    });

    return NextResponse.json({
      success: true,
      message: 'Você agora é superadmin!',
      admin: {
        email: user.email,
        role: 'superadmin',
        permanent: true
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no bootstrap:', error);
    return NextResponse.json(
      { error: 'Erro no bootstrap: ' + error.message },
      { status: 500 }
    );
  }
}
