import { NextResponse } from 'next/server';
import { enhanceImage } from '@/lib/gemini';
import { checkToolAccess } from '@/lib/billing/service';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { validateImage, createValidationErrorResponse } from '@/lib/image-validation';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api-middleware';


export const POST = withAuth(async (req, { userId, user }) => {
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

  // 🔓 BILLING: Admin bypass + check acesso + limites
  const billing = await checkToolAccess({
    userId,
    user,
    toolName: 'enhance',
    trialDeniedMessage: 'O Aprimoramento 4K é exclusivo para assinantes. Faça o upgrade para transformar sua imagem!',
  });
  if (billing.denied) return billing.response!;

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
    isAdmin: billing.isAdmin,
  });

  // Aprimorar imagem
  const enhancedImage = await enhanceImage(image);

  logger.info('[Enhance] Enhancement concluído', {
    enhancedImageLength: enhancedImage?.length,
    hasImage: !!enhancedImage
  });

  // ✅ REGISTRAR USO após operação bem-sucedida
  await billing.recordUsage();

  return NextResponse.json({ image: enhancedImage });
});

// 🚀 CORREÇÃO #2: Timeout aumentado de 60s → 120s
export const maxDuration = 120;
