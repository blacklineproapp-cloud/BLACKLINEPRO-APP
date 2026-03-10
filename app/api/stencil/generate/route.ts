import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { generateStencilWithCost } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/ratelimit';
import { recordUsage } from '@/lib/billing/limits';
import { calculateCostWithFallback, type OperationType } from '@/lib/billing/costs';
import { validateImage, createValidationErrorResponse } from '@/lib/image-validation';
import { logger } from '@/lib/logger';
import { applyPreviewProtection } from '@/lib/stencil-preview';

export async function POST(req: Request) {
  try {
    // ─── BYOK PATH: usuário traz sua própria chave Gemini ───────────────────
    const userApiKey = req.headers.get('X-User-API-Key');
    if (userApiKey) {
      // Rate limit por IP para evitar abuso (100 req/hora por IP)
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
      return await processGeneration(req, null, null, false, false, userApiKey);
    }

    // ─── AUTH PATH: fluxo padrão com Clerk ──────────────────────────────────
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMIT: 10 requisições por minuto por usuário
    const { success, limit, remaining, reset } = await rateLimit(`stencil-gen:${userId}`, 10, 60);

    if (!success) {
      return NextResponse.json({
        error: 'Too Many Requests',
        message: 'Você está gerando muito rápido! Aguarde alguns segundos.',
        remaining,
        resetDate: new Date(reset).toISOString()
      }, { status: 429 });
    }

    const userData = await getOrCreateUser(userId);

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userIsAdmin = await checkIsAdmin(userId);

    if (userIsAdmin) {
      return await processGeneration(req, userId, userData.id, true);
    }

    const hasActiveCourtesy = userData.admin_courtesy &&
      userData.admin_courtesy_expires_at &&
      new Date(userData.admin_courtesy_expires_at) > new Date();

    const isFreePlan = !userData.is_paid && !hasActiveCourtesy;

    // BYOK: Gerações ilimitadas para todos os planos (usuário usa sua chave Gemini)
    // Free users recebem preview com blur (upsell)
    return await processGeneration(req, userId, userData.id, false, isFreePlan);
  } catch (error: any) {
    logger.error('[Generate] Erro ao gerar estêncil', { error });
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar estêncil' },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar geração
async function processGeneration(
  req: Request,
  clerkUserId: string | null,
  userUuid: string | null,
  isAdmin: boolean,
  isPreview: boolean = false,
  userApiKey?: string
) {
  // Validar e parsear JSON
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { image, style, promptDetails } = body;

  // Validar imagem
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Imagem não fornecida ou inválida' }, { status: 400 });
  }

  // Validar promptDetails (máximo 1000 caracteres)
  if (promptDetails && (typeof promptDetails !== 'string' || promptDetails.length > 1000)) {
    return NextResponse.json({ 
      error: 'Instruções extras muito longas (máximo 1000 caracteres)' 
    }, { status: 400 });
  }

  // 🚀 CORREÇÃO #1: Validar imagem ANTES de processar (previne OOM e erros Gemini)
  const validation = await validateImage(image);
  if (!validation.valid) {
    logger.warn('[Generate] Validação falhou', { error: validation.error });
    return NextResponse.json(
      createValidationErrorResponse(validation),
      { status: 413 }
    );
  }

  // VALIDAÇÃO: Garantir que style é um valor válido
  const validStyles = ['standard', 'perfect_lines', 'anime'] as const;
  const selectedStyle = (validStyles as readonly string[]).includes(style) ? style as 'standard' | 'perfect_lines' | 'anime' : 'standard';

  logger.info('[Generate] Gerando stencil', {
    ...validation.metadata,
    style: selectedStyle,
    isAdmin,
  });

  // Gerar stencil (BYOK usa chave do usuário, path normal usa chave do sistema)
  const { image: stencilImage, usageMetadata } = await generateStencilWithCost(image, promptDetails, selectedStyle, userApiKey);

  // 💰 Registrar uso apenas para usuários autenticados (não BYOK anônimo)
  if (userUuid) {
    const operationType: OperationType = selectedStyle === 'anime'
      ? 'anime'
      : selectedStyle === 'perfect_lines'
        ? 'topographic'
        : 'lines';
    const realCostUSD = calculateCostWithFallback(operationType, usageMetadata);
    await recordUsage({
      userId: userUuid,
      type: 'editor_generation',
      operationType: 'generate_stencil',
      cost: realCostUSD,
      metadata: {
        style: selectedStyle,
        operation: 'generate_stencil',
        is_admin: isAdmin,
        tokens: usageMetadata
      }
    });
  }

  // 🎣 FREE USERS (auth path only): Aplicar proteção de preview
  if (isPreview && userUuid && clerkUserId) {
    try {
      const { data: userInfo } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userUuid)
        .single();

      const previewImage = await applyPreviewProtection(stencilImage, {
        userEmail: userInfo?.email,
        userId: clerkUserId,
      });

      return NextResponse.json({
        image: previewImage,
        isPreview: true,
        message: 'Este é um preview. Assine para desbloquear o stencil em alta qualidade!',
        remaining: 0,
      });
    } catch (previewError: any) {
      logger.error('[Generate] Erro ao aplicar preview protection:', previewError);
      return NextResponse.json({
        image: stencilImage,
        isPreview: true,
        message: 'Assine para desbloquear o stencil em alta qualidade!',
      });
    }
  }

  return NextResponse.json({ image: stencilImage });
}

// 🚀 CORREÇÃO #2: Timeout aumentado de 60s → 120s
// Gemini pode levar 90-120s para processar imagens grandes em produção
export const maxDuration = 120;
