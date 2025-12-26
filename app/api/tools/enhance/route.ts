import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { enhanceImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { checkToolsLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';

// Emails admin com acesso ilimitado
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar usuário completo (precisa do UUID user.id)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, is_paid, subscription_status, tools_unlocked')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userEmailLower = userData.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);

    if (!isAdmin) {
      // Verificar assinatura (apenas para não-admins)
      if (!userData.is_paid || userData.subscription_status !== 'active') {
        return NextResponse.json({
          error: 'Assinatura necessária',
          message: 'Assine o plano básico primeiro.',
          requiresSubscription: true,
          subscriptionType: 'subscription'
        }, { status: 403 });
      }

      // Verificar ferramentas desbloqueadas (apenas para não-admins)
      if (!userData.tools_unlocked) {
        return NextResponse.json({
          error: 'Ferramentas premium não desbloqueadas',
          message: 'Desbloqueie as ferramentas premium por R$ 50.',
          requiresSubscription: true,
          subscriptionType: 'tools'
        }, { status: 403 });
      }

      // ✅ VERIFICAR LIMITE DE USO (100/500 por plano)
      const limitCheck = await checkToolsLimit(userData.id);

      if (!limitCheck.allowed) {
        const message = getLimitMessage('tool_usage', limitCheck.limit, limitCheck.resetDate);
        return NextResponse.json(
          {
            error: 'Limite atingido',
            message,
            remaining: limitCheck.remaining,
            limit: limitCheck.limit,
            resetDate: limitCheck.resetDate,
            requiresSubscription: true,
            subscriptionType: 'credits',
          },
          { status: 429 }
        );
      }
    }

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Aprimorar imagem
    const enhancedImage = await enhanceImage(image);

    // ✅ REGISTRAR USO após operação bem-sucedida (exceto admins)
    if (!isAdmin) {
      await recordUsage({
        userId: userData.id,
        type: 'tool_usage',
        metadata: {
          tool: 'enhance',
          operation: 'enhance_image'
        }
      });
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
