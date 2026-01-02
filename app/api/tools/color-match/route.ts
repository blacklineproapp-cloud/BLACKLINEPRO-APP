import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { analyzeImageColors } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { checkToolsLimit, checkColorMatchLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMITING: Prevenir abuso (60 requests/min)
    const identifier = await getRateLimitIdentifier(userId);

    if (apiLimiter) {
      const { success, limit, remaining, reset } = await apiLimiter.limit(identifier);

      if (!success) {
        return NextResponse.json(
          {
            error: 'Muitas requisições',
            message: 'Você atingiu o limite de requisições. Tente novamente em alguns minutos.',
            limit,
            remaining,
            reset: new Date(reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }

    const user = await getOrCreateUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userIsAdmin = await checkIsAdmin(userId);

    if (!userIsAdmin) {
      // Verificar se tem assinatura ativa OU ferramentas desbloqueadas
      const hasFullAccess = (user.is_paid && user.subscription_status === 'active' && user.tools_unlocked);

      if (hasFullAccess) {
        // ✅ VERIFICAR LIMITE DE USO DO PLANO (100/500 por plano)
        const limitCheck = await checkToolsLimit(user.id);
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
      } else {
        // 🎁 MODO TRIAL: Usuários Free ou sem ferramentas desbloqueadas
        const trialCheck = await checkColorMatchLimit(user.id);
        
        if (!trialCheck.allowed) {
          return NextResponse.json({
            error: 'Trial encerrado',
            message: 'Você já usou seus 2 testes gratuitos de Color Match. Assine para desbloquear acesso ilimitado!',
            requiresSubscription: true,
            subscriptionType: 'tools'
          }, { status: 403 });
        }
      }
    }

    const { image, brand } = await req.json();

    if (!image || !brand) {
      return NextResponse.json({ error: 'Imagem e marca são obrigatórios' }, { status: 400 });
    }

    // Analisar cores
    const colorPalette = await analyzeImageColors(image, brand);

    // Registrar uso (ignorar erros)
    try {
      if (!userIsAdmin) {
        await recordUsage({
          userId: user.id,
          type: 'tool_usage',
          operationType: 'color_match',
          metadata: {
            tool: 'color_match',
            brand
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao registrar uso de IA:', e);
    }

    return NextResponse.json(colorPalette);
  } catch (error: any) {
    console.error('Erro ao analisar cores:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao analisar cores' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
