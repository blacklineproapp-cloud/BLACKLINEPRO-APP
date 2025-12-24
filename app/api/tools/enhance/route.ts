import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { enhanceImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';

// Emails admin com acesso ilimitado
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

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

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userEmailLower = user.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);

    if (!isAdmin) {
      // Verificar assinatura (apenas para não-admins)
      if (!user.is_paid || user.subscription_status !== 'active') {
        return NextResponse.json({
          error: 'Assinatura necessária',
          message: 'Assine o plano básico primeiro.',
          requiresSubscription: true,
          subscriptionType: 'subscription'
        }, { status: 403 });
      }

      // Verificar ferramentas desbloqueadas (apenas para não-admins)
      if (!user.tools_unlocked) {
        return NextResponse.json({
          error: 'Ferramentas premium não desbloqueadas',
          message: 'Desbloqueie as ferramentas premium por R$ 50.',
          requiresSubscription: true,
          subscriptionType: 'tools'
        }, { status: 403 });
      }
    }

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Aprimorar imagem
    const enhancedImage = await enhanceImage(image);

    // Registrar uso (ignorar erros)
    try {
      await supabaseAdmin.from('ai_usage').insert({
        user_id: user.id,
        operation_type: 'enhance',
        tokens_used: 1200,
        cost: 0.20,
        model_used: 'gemini-2.0-flash-exp',
      });
    } catch (e) {
      console.warn('Erro ao registrar uso de IA:', e);
    }

    return NextResponse.json({ image: enhancedImage });
  } catch (error: any) {
    console.error('Erro ao aprimorar imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao aprimorar imagem' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
