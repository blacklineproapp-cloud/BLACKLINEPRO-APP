import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Ativar assinatura para desenvolvimento
// ATENÇÃO: Remover em produção ou proteger com chave secreta
export async function POST(req: Request) {
  // Apenas funciona em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Não disponível em produção' }, { status: 403 });
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const { type } = await req.json(); // 'subscription' ou 'tools'

    if (type === 'subscription') {
      // Ativar assinatura
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          is_paid: true,
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        })
        .eq('clerk_id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Assinatura ativada!' });
    }

    if (type === 'tools') {
      // Desbloquear ferramentas
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          tools_unlocked: true,
        })
        .eq('clerk_id', userId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Ferramentas desbloqueadas!' });
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao ativar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
