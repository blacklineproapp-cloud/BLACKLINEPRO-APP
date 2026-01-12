import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { generateStencilFromImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createStencilLimiter,
  getRateLimitIdentifier,
  withRateLimit,
} from '@/lib/rate-limit';
import { checkEditorLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { BRL_COST } from '@/lib/credits';
import { validateImage, createValidationErrorResponse } from '@/lib/image-validation';
import { logger } from '@/lib/logger';
import { trackTrialUsage, getClientIP } from '@/lib/abuse-prevention';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

    // 🔒 VERIFICAR PAGAMENTO - Bloquear usuários não pagos
    // EXCEÇÃO: Usuários com cortesia ativa podem usar
    const hasActiveCourtesy = userData.admin_courtesy && 
      userData.admin_courtesy_expires_at &&
      new Date(userData.admin_courtesy_expires_at) > new Date();
    
    if (!userData.is_paid && !hasActiveCourtesy) {
      return NextResponse.json(
        {
          error: 'Assinatura necessária',
          message: 'O Editor é exclusivo para assinantes. Escolha um plano para começar a criar seus estênceis!',
          requiresSubscription: true,
          subscriptionType: 'subscription',
        },
        { status: 403 }
      );
    }

    // 2. VERIFICAR LIMITE DE USO (100/500 por plano)
    const limitCheck = await checkEditorLimit(userData.id);

    if (!limitCheck.allowed) {
      // Diferenciar mensagem para usuários Free (Trial) vs Assinantes
      const isFreePlan = (userData.plan === 'free' || !userData.plan);
      const message = isFreePlan 
        ? 'O uso do Editor é exclusivo para assinantes. Escolha um plano para começar a criar seus estênceis!'
        : getLimitMessage('editor_generation', limitCheck.limit, limitCheck.resetDate);

      return NextResponse.json(
        {
          error: isFreePlan ? 'Trial encerrado' : 'Limite atingido',
          message,
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          resetDate: limitCheck.resetDate,
          requiresSubscription: true,
          subscriptionType: 'subscription', // Para editor, o upgrade é para assinatura
        },
        { status: 429 }
      );
    }

    // 3. Processar geração
    return await processGeneration(req, userId, userData.id, false);
  } catch (error: any) {
    console.error('Erro ao gerar estêncil:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar estêncil' },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar geração
async function processGeneration(req: Request, clerkUserId: string, userUuid: string, isAdmin: boolean) {
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
  const validStyles = ['standard', 'perfect_lines'] as const;
  const selectedStyle = (validStyles as readonly string[]).includes(style) ? style as 'standard' | 'perfect_lines' : 'standard';

  logger.info('[Generate] Gerando stencil', {
    ...validation.metadata,
    style: selectedStyle,
    isAdmin,
  });

  // Gerar stencil no modo selecionado pelo usuário
  const stencilImage = await generateStencilFromImage(image, promptDetails, selectedStyle);

  // ✅ REGISTRAR USO após geração bem-sucedida
  await recordUsage({
    userId: userUuid,
    type: 'editor_generation',
    operationType: 'generate_stencil',
    cost: selectedStyle === 'perfect_lines' ? BRL_COST.lines : BRL_COST.topographic,
    metadata: {
      style: selectedStyle,
      operation: 'generate_stencil',
      is_admin: isAdmin
    }
  });

  // 🛡️ RASTREAR TRIAL USAGE POR IP (Removido - Trial desativado)
  /* 
  if (!isAdmin && user?.plan === 'free') {
    const ipAddress = await getClientIP();
    await trackTrialUsage({ ... });
  }
  */

  return NextResponse.json({ image: stencilImage });
}

// 🚀 CORREÇÃO #2: Timeout aumentado de 60s → 120s
// Gemini pode levar 90-120s para processar imagens grandes em produção
export const maxDuration = 120;
