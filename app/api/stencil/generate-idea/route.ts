import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { generateTattooIdea } from '@/lib/gemini';
import { rateLimit } from '@/lib/ratelimit';
import { checkPaidAccess } from '@/lib/billing/service';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // ─── BYOK PATH: usuário traz sua própria chave Gemini ───────────────────
    const userApiKey = req.headers.get('X-User-API-Key');
    if (userApiKey) {
      const ip = req.headers.get('cf-connecting-ip')
        || req.headers.get('x-real-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
      const { success: ipOk } = await rateLimit(`byok-ip:${ip}`, 100, 3600);
      if (!ipOk) {
        return NextResponse.json({
          error: 'Too Many Requests',
          message: 'Muitas gerações por hora. Aguarde antes de continuar.',
        }, { status: 429 });
      }
      const { prompt, size, referenceImage } = await req.json();
      if (!prompt) return NextResponse.json({ error: 'Prompt não fornecido' }, { status: 400 });
      const tattooImage = await generateTattooIdea(prompt, size, referenceImage, userApiKey);
      return NextResponse.json({ image: tattooImage });
    }

    // ─── AUTH PATH: fluxo padrão com Clerk ──────────────────────────────────
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await getOrCreateUser(userId);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BILLING: Admin bypass + check assinatura paga
    const billing = await checkPaidAccess({
      userId,
      user,
      featureName: 'generate_idea',
      deniedMessage: 'A criação de artes com IA é exclusiva para assinantes. Comece a criar designs incríveis agora!',
      usageType: 'ai_request',
      operationType: 'ia_gen',
    });
    if (billing.denied) return billing.response!;

    const { prompt, size, referenceImage } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt não fornecido' }, { status: 400 });
    }

    const tattooImage = await generateTattooIdea(prompt, size, referenceImage);

    // ✅ REGISTRAR USO após operação bem-sucedida
    await billing.recordUsage({ prompt, size });

    return NextResponse.json({ image: tattooImage });
  } catch (error: any) {
    logger.error('[GenerateIdea] Erro ao gerar ideia', { error });
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar ideia' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
