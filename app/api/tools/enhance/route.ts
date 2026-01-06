import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { enhanceImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { checkToolsLimit, checkEnhance4KLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { BRL_COST } from '@/lib/credits';
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
    const userIsAdmin = await checkIsAdmin(userId);

    if (!userIsAdmin) {
      // Verificar se tem assinatura ativa OU ferramentas desbloqueadas
      const hasFullAccess = (userData.is_paid && userData.subscription_status === 'active' && userData.tools_unlocked);

      if (hasFullAccess) {
        // ✅ VERIFICAR LIMITE DE USO DO PLANO (100/500 por plano)
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
      } else {
        // 🎁 MODO TRIAL: Usuários Free ou sem ferramentas desbloqueadas
        const trialCheck = await checkEnhance4KLimit(userData.id);
        
        if (!trialCheck.allowed) {
          return NextResponse.json({
            error: 'Trial encerrado',
            message: 'Você já usou seus 2 testes gratuitos de Aprimoramento. Assine para desbloquear acesso ilimitado!',
            requiresSubscription: true,
            subscriptionType: 'tools'
          }, { status: 403 });
        }
      }
    }

    const { image, targetDpi, widthCm, heightCm } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // 🚀 CORREÇÃO #1: Validar imagem ANTES de processar (previne OOM e erros Gemini)
    const validation = await validateImage(image);
    if (!validation.valid) {
      logger.warn('[Enhance] Validação falhou', { error: validation.error });
      return NextResponse.json(
        createValidationErrorResponse(validation),
        { status: 413 }
      );
    }

    logger.info('[Enhance] Iniciando enhancement', {
      ...validation.metadata,
      targetDpi,
      widthCm,
      heightCm,
      userIsAdmin,
    });

    // Aprimorar imagem
    const enhancedImage = await enhanceImage(image);

    console.log('[Enhance API] Enhancement concluído:', {
      enhancedImageLength: enhancedImage?.length,
      hasImage: !!enhancedImage
    });

    // ✅ REGISTRAR USO após operação bem-sucedida
    await recordUsage({
      userId: userData.id,
      type: 'tool_usage',
      operationType: 'enhance_image',
      cost: BRL_COST.enhance,
      metadata: {
        tool: 'enhance',
        operation: 'enhance_image',
        is_admin: userIsAdmin
      }
    });

    return NextResponse.json({ image: enhancedImage });
  } catch (error: any) {
    console.error('Erro ao aprimorar imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao aprimorar imagem' },
      { status: 500 }
    );
  }
}

// 🚀 CORREÇÃO #2: Timeout aumentado de 60s → 120s
// Gemini pode levar 90-120s para processar imagens grandes em produção
export const maxDuration = 120;
