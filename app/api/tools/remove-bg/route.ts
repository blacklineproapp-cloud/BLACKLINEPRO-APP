import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin as checkIsAdmin } from '@/lib/auth';
import { removeBackground } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { checkToolsLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';
import { validateImage, createValidationErrorResponse } from '@/lib/image-validation';
import { logger } from '@/lib/logger';


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

    // Buscar usuário completo
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, is_paid, subscription_status, tools_unlocked')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BYPASS PARA ADMINS
    const userIsAdmin = await checkIsAdmin(userId);

    if (!userIsAdmin) {
      // Verificar assinatura
      if (!userData.is_paid || userData.subscription_status !== 'active') {
        return NextResponse.json({
          error: 'Assinatura necessária',
          message: 'Assine o plano básico primeiro.',
          requiresSubscription: true,
          subscriptionType: 'subscription'
        }, { status: 403 });
      }

      // Verificar ferramentas desbloqueadas
      if (!userData.tools_unlocked) {
        return NextResponse.json({
          error: 'Ferramentas premium não desbloqueadas',
          message: 'Desbloqueie as ferramentas premium por R$ 50.',
          requiresSubscription: true,
          subscriptionType: 'tools'
        }, { status: 403 });
      }

      // ✅ VERIFICAR LIMITE DE USO
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

    // 🚀 CORREÇÃO #1: Validar imagem ANTES de processar (previne OOM e erros Gemini)
    const validation = await validateImage(image);
    if (!validation.valid) {
      logger.warn('[Remove BG] Validação falhou', { error: validation.error });
      return NextResponse.json(
        createValidationErrorResponse(validation),
        { status: 413 }
      );
    }

    logger.info('[Remove BG] Iniciando remoção de fundo', {
      ...validation.metadata,
      userIsAdmin,
    });

    // Remover fundo
    const resultImage = await removeBackground(image);

    console.log('[Remove BG API] Remoção concluída:', {
      resultImageLength: resultImage?.length,
      hasImage: !!resultImage
    });

    // ✅ REGISTRAR USO após operação bem-sucedida (exceto admins)
    if (!userIsAdmin) {
      await recordUsage({
        userId: userData.id,
        type: 'tool_usage',
        operationType: 'remove_background',
        metadata: {
          tool: 'remove_bg',
          operation: 'remove_background'
        }
      });
    }

    return NextResponse.json({ image: resultImage });
  } catch (error: any) {
    console.error('Erro ao remover fundo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao remover fundo' },
      { status: 500 }
    );
  }
}

// 🚀 CORREÇÃO #2: Timeout aumentado de 60s → 120s
// Gemini pode levar 90-120s para processar imagens grandes em produção
export const maxDuration = 120;
