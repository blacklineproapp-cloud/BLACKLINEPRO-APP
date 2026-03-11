import { NextResponse } from 'next/server';
import { checkToolAccess } from '@/lib/billing/service';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
import { withAuth } from '@/lib/api-middleware';
import { splitImageIntoA4Pages, type CropArea, type FlipTransform } from '@/lib/tools/split-a4';

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
    toolName: 'split_a4',
    trialDeniedMessage: 'A Impressão em Ladrilhos (Split A4) é exclusiva para assinantes. Facilite seu trabalho agora!',
  });
  if (billing.denied) return billing.response!;
  const userIsAdmin = billing.isAdmin;

  const {
    image,
    tattooWidth,
    tattooHeight,
    paperWidth,
    paperHeight,
    overlap = 0.5,
    offsetX = 0,
    offsetY = 0,
    processMode = 'reference',
    forcedCols,
    forcedRows,
    croppedArea,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
  }: {
    image: string;
    tattooWidth: number;
    tattooHeight: number;
    paperWidth: number;
    paperHeight: number;
    overlap?: number;
    offsetX?: number;
    offsetY?: number;
    processMode?: 'reference' | 'topographic' | 'perfect_lines' | 'anime';
    forcedCols?: number;
    forcedRows?: number;
    croppedArea?: CropArea;
    rotation?: number;
    flip?: FlipTransform;
  } = await req.json();

  // Validação de entrada
  if (!image || !tattooWidth || !tattooHeight || !paperWidth || !paperHeight) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  if (tattooWidth < 1 || tattooWidth > 200 || tattooHeight < 1 || tattooHeight > 200) {
    return NextResponse.json({ error: 'Tamanho da tattoo inválido (1-200cm)' }, { status: 400 });
  }

  if (paperWidth < 10 || paperWidth > 100 || paperHeight < 10 || paperHeight > 100) {
    return NextResponse.json({ error: 'Tamanho de papel inválido' }, { status: 400 });
  }

  // Processar
  const result = await splitImageIntoA4Pages({
    imageBase64: image,
    tattooWidthCm: tattooWidth,
    tattooHeightCm: tattooHeight,
    paperWidthCm: paperWidth,
    paperHeightCm: paperHeight,
    overlapCm: overlap,
    offsetXCm: offsetX,
    offsetYCm: offsetY,
    processMode,
    forcedCols,
    forcedRows,
    userUuid: user.id,
    userIsAdmin,
    croppedArea,
    rotation,
    flip
  });

  return NextResponse.json(result);
});

export const maxDuration = 60;
