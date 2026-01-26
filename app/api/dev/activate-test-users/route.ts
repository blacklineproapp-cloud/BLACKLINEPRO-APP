import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin as checkIsAdmin } from '@/lib/auth';

/**
 * Endpoint de desenvolvimento para ativar usuários de teste
 * 🔒 SEGURANÇA: Apenas admins podem usar, mesmo em dev
 */
export async function POST(req: Request) {
  // ✅ DUPLA PROTEÇÃO: Bloquear em produção E verificar admin
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  // 🔒 Segunda camada: Verificar se é admin
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userIsAdmin = await checkIsAdmin(userId);
  if (!userIsAdmin) {
    return NextResponse.json({ error: 'Apenas administradores podem usar este endpoint' }, { status: 403 });
  }

  const testEmails = [
    'coutthomas7@gmail.com',
    'erickrussomat@gmail.com',
    'yurilojavirtual@gmail.com'
  ];

  try {
    // Ativar assinatura e ferramentas para todos os emails de teste
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        is_paid: true,
        subscription_status: 'active',
        subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        tools_unlocked: true,
      })
      .in('email', testEmails)
      .select();

    if (error) {
      console.error('Erro ao ativar usuários de teste:', error);
      return NextResponse.json(
        { error: 'Erro ao ativar usuários', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuários de teste ativados com sucesso!',
      activatedCount: data?.length || 0,
      users: data?.map(u => ({ email: u.email, is_paid: u.is_paid, tools_unlocked: u.tools_unlocked }))
    });
  } catch (error: any) {
    console.error('Erro ao ativar usuários de teste:', error);
    return NextResponse.json(
      { error: 'Erro interno', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET para facilitar teste no navegador
 * 🔒 SEGURANÇA: Apenas admins podem ver
 */
export async function GET(req: Request) {
  // ✅ DUPLA PROTEÇÃO: Bloquear em produção E verificar admin
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  // 🔒 Segunda camada: Verificar se é admin
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userIsAdmin = await checkIsAdmin(userId);
  if (!userIsAdmin) {
    return NextResponse.json({ error: 'Apenas administradores podem usar este endpoint' }, { status: 403 });
  }

  return NextResponse.json({
    message: 'Use POST para ativar usuários de teste',
    testEmails: [
      'coutthomas7@gmail.com',
      'erickrussomat@gmail.com',
      'yurilojavirtual@gmail.com'
    ]
  });
}
