import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { generateStencilFromImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import {
  createStencilLimiter,
  getRateLimitIdentifier,
  withRateLimit,
} from '@/lib/rate-limit';
import { canUseOperation, consumeOperation, type PlanType } from '@/lib/credits';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. RATE LIMITING: Obter plano do usuário para definir limite
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('clerk_id', userId)
      .single();

    const plan = (userData?.plan || 'starter') as PlanType;
    const identifier = await getRateLimitIdentifier(userId);
    const limiter = createStencilLimiter(plan);

    // Aplicar rate limiting
    return withRateLimit(limiter, identifier, async () => {
      // 2. SISTEMA DE CRÉDITOS: Verificar se pode usar operação
      const canUse = await canUseOperation(userId, 'topographic');

      if (!canUse.allowed) {
        return NextResponse.json(
          {
            error: 'Limite atingido',
            message: canUse.reason,
            requiresSubscription: true,
            subscriptionType: 'credits',
          },
          { status: 403 }
        );
      }

      // 3. Buscar ou criar usuário (para compatibilidade)
      const user = await getOrCreateUser(userId);

      if (!user) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }

    // Processar requisição
    const { image, style, promptDetails } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

      // 4. Gerar estêncil
      const stencilImage = await generateStencilFromImage(image, promptDetails, style);

      // 5. CONSUMIR CRÉDITO/LIMITE após geração bem-sucedida
      const consumeResult = await consumeOperation(userId, 'topographic');

      if (!consumeResult.success) {
        console.error('Erro ao consumir operação:', consumeResult.error);
        // Não bloquear a resposta, apenas logar
      }

      // 6. Registrar uso de IA no ai_usage (legacy - para compatibilidade)
      try {
        await supabaseAdmin.from('ai_usage').insert({
          user_id: user.id,
          operation_type: 'generate_stencil',
          tokens_used: 1000,
          cost: 0.15,
          model_used: 'gemini-2.0-flash-exp',
        });
      } catch (e) {
        console.warn('Erro ao registrar uso de IA (legacy):', e);
      }

      return NextResponse.json({ image: stencilImage });
    });
  } catch (error: any) {
    console.error('Erro ao gerar estêncil:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar estêncil' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
