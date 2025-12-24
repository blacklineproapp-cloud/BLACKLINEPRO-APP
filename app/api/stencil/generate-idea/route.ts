import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { generateTattooIdea } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar assinatura - mensagem amigável
    if (!user.is_paid || user.subscription_status !== 'active') {
      return NextResponse.json({
        error: 'Assinatura necessária',
        message: 'Assine o plano para gerar ideias de tatuagem com IA.',
        requiresSubscription: true,
        subscriptionType: 'subscription'
      }, { status: 403 });
    }

    const { prompt, size } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt não fornecido' }, { status: 400 });
    }

    // Gerar ideia
    const tattooImage = await generateTattooIdea(prompt, size);

    // Registrar uso (ignorar erros)
    try {
      await supabaseAdmin.from('ai_usage').insert({
        user_id: user.id,
        operation_type: 'generate_idea',
        tokens_used: 800,
        cost: 0.12,
        model_used: 'gemini-2.0-flash-exp',
      });
    } catch (e) {
      console.warn('Erro ao registrar uso de IA:', e);
    }

    return NextResponse.json({ image: tattooImage });
  } catch (error: any) {
    console.error('Erro ao gerar ideia:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar ideia' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
