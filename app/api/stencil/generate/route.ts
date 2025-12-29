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

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Buscar usuário completo (precisa do UUID user.id)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, plan')
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

    // 2. VERIFICAR LIMITE DE USO (100/500 por plano)
    const limitCheck = await checkEditorLimit(userData.id);

    if (!limitCheck.allowed) {
      const message = getLimitMessage('editor_generation', limitCheck.limit, limitCheck.resetDate);
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
  // Processar requisição
  const { image, style, promptDetails } = await req.json();

  if (!image) {
    return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
  }

  // VALIDAÇÃO: Garantir que style é um valor válido
  const validStyles = ['standard', 'perfect_lines'] as const;
  const selectedStyle = validStyles.includes(style) ? style : 'standard';

  // Log para debug - verificar qual modo foi selecionado

  // Gerar stencil no modo selecionado pelo usuário
  const stencilImage = await generateStencilFromImage(image, promptDetails, selectedStyle);

  // ✅ REGISTRAR USO após geração bem-sucedida (exceto admins)
  if (!isAdmin) {
    await recordUsage({
      userId: userUuid,
      type: 'editor_generation',
      operationType: 'generate_stencil',
      metadata: {
        style: selectedStyle,
        operation: 'generate_stencil'
      }
    });
  }

  return NextResponse.json({ image: stencilImage });
}

export const maxDuration = 60;
