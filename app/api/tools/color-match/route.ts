import { NextResponse } from 'next/server';
import { analyzeImageColors } from '@/lib/gemini';
import { checkToolAccess } from '@/lib/billing/service';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/ratelimit';
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
    toolName: 'color_match',
    trialDeniedMessage: 'A Harmonização de Cores é exclusiva para assinantes. Escolha um plano para usar!',
  });
  if (billing.denied) return billing.response!;

  const { image, brand } = await req.json();

  if (!image || !brand) {
    return NextResponse.json({ error: 'Imagem e marca são obrigatórios' }, { status: 400 });
  }

  // Analisar cores
  const colorPalette = await analyzeImageColors(image, brand);

  // ✅ REGISTRAR USO após operação bem-sucedida
  await billing.recordUsage({ brand });

  return NextResponse.json(colorPalette);
});

export const maxDuration = 60;
