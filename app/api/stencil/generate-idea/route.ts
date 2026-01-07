import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { generateTattooIdea } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAILimit, checkGenerateIdeaLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { BRL_COST } from '@/lib/credits';

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

    // 🔓 BYPASS PARA ADMINS
    const userIsAdmin = await checkIsAdmin(userId);

    if (!userIsAdmin) {
      // Verificar se tem assinatura ativa
      const hasFullAccess = (user.is_paid && user.subscription_status === 'active');

      if (hasFullAccess) {
        // ✅ VERIFICAR LIMITE DE USO DO PLANO
        const limitCheck = await checkAILimit(user.id);
        if (!limitCheck.allowed) {
          const message = getLimitMessage('ai_request', limitCheck.limit, limitCheck.resetDate);
          return NextResponse.json(
            {
              error: 'Limite atingido',
              message,
              remaining: limitCheck.remaining,
              limit: limitCheck.limit,
              resetDate: limitCheck.resetDate,
              requiresSubscription: true,
              subscriptionType: 'subscription',
            },
            { status: 429 }
          );
        }
      } else {
        // 🎁 MODO TRIAL: Usuários Free
        const trialCheck = await checkGenerateIdeaLimit(user.id);
        
        if (!trialCheck.allowed) {
          const message = 'A criação de artes com IA é exclusiva para assinantes. Comece a criar designs incríveis agora!';
          return NextResponse.json({
            error: 'Acesso negado',
            message,
            requiresSubscription: true,
            subscriptionType: 'subscription'
          }, { status: 403 });
        }
      }
    }

    const { prompt, size } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt não fornecido' }, { status: 400 });
    }

    // Gerar ideia
    const tattooImage = await generateTattooIdea(prompt, size);

    // Registrar uso após geração bem-sucedida
    try {
      await recordUsage({
        userId: user.id,
        type: 'ai_request',
        operationType: 'generate_idea',
        cost: BRL_COST.ia_gen,
        metadata: {
          tool: 'generate_idea',
          operation: 'generate_idea',
          prompt,
          size,
          is_admin: userIsAdmin
        }
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
