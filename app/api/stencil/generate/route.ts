import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { generateStencilFromImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/ratelimit';
import { checkEditorLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { BRL_COST } from '@/lib/billing/costs';
import { validateImage, createValidationErrorResponse } from '@/lib/image-validation';
import { logger } from '@/lib/logger';
import { applyPreviewProtection } from '@/lib/stencil-preview';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 🛡️ RATE LIMIT: 10 requisições por minuto por usuário
    // Protege contra scripts e abuso de GPU
    const { success, limit, remaining, reset } = await rateLimit(`stencil-gen:${userId}`, 10, 60);
    
    if (!success) {
      return NextResponse.json({
        error: 'Too Many Requests',
        message: 'Você está gerando muito rápido! Aguarde alguns segundos.',
        remaining,
        resetDate: new Date(reset).toISOString()
      }, { status: 429 });
    }

    // 1. Buscar usuário completo (precisa do UUID user.id)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, plan, is_paid, subscription_status, admin_courtesy, admin_courtesy_expires_at')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userIsAdmin = await checkIsAdmin(userId);

    if (userIsAdmin) {
      // Admin: processar diretamente sem limitações
      return await processGeneration(req, userId, userData.id, true);
    }

    // Verificar se é usuário gratuito (para preview com blur)
    const hasActiveCourtesy = userData.admin_courtesy &&
      userData.admin_courtesy_expires_at &&
      new Date(userData.admin_courtesy_expires_at) > new Date();

    const isFreePlan = !userData.is_paid && !hasActiveCourtesy;

    // 2. VERIFICAR LIMITE DE USO
    const limitCheck = await checkEditorLimit(userData.id);

    if (!limitCheck.allowed) {
      const message = isFreePlan
        ? 'Você já usou seus previews gratuitos! Assine para desbloquear stencils em alta qualidade.'
        : getLimitMessage('editor_generation', limitCheck.limit, limitCheck.resetDate);

      return NextResponse.json(
        {
          error: isFreePlan ? 'Previews esgotados' : 'Limite atingido',
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

    // 3. Processar geração (free users recebem preview degradado)
    return await processGeneration(req, userId, userData.id, false, isFreePlan);
  } catch (error: any) {
    console.error('Erro ao gerar estêncil:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar estêncil' },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar geração
async function processGeneration(req: Request, clerkUserId: string, userUuid: string, isAdmin: boolean, isPreview: boolean = false) {
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

  // Gerar stencil no modo selecionado pelo usuário
  const stencilImage = await generateStencilFromImage(image, promptDetails, selectedStyle);

  // ✅ REGISTRAR USO após geração bem-sucedida
  // Mapear estilo para tipo de operação para custo correto
  const operationCost = selectedStyle === 'anime' 
    ? BRL_COST.anime 
    : selectedStyle === 'perfect_lines' 
      ? BRL_COST.topographic 
      : BRL_COST.lines;

  await recordUsage({
    userId: userUuid,
    type: 'editor_generation',
    operationType: 'generate_stencil',
    cost: operationCost,
    metadata: {
      style: selectedStyle,
      operation: 'generate_stencil',
      is_admin: isAdmin
    }
  });

  // 🎣 FREE USERS: Aplicar proteção de preview (blur + watermark + resolução capada)
  if (isPreview) {
    try {
      // Buscar email do usuário para watermark personalizada
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
        remaining: 0, // Será atualizado pelo front
      });
    } catch (previewError: any) {
      logger.error('[Generate] Erro ao aplicar preview protection:', previewError);
      // Fallback: retorna com flag de preview mesmo sem blur
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
