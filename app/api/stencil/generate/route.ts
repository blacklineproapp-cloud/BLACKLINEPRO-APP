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

// Emails admin com acesso ilimitado
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Obter plano e email do usuário
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('plan, email')
      .eq('clerk_id', userId)
      .single();

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userEmailLower = userData?.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);
    
    if (isAdmin) {
      console.log(`[Generate] Admin bypass para: ${userData?.email}`);
      // Admin: processar diretamente sem limitações
      return await processGeneration(req, userId);
    }

    // 2. RATE LIMITING para não-admins
    const plan = (userData?.plan || 'free') as PlanType;
    const identifier = await getRateLimitIdentifier(userId);
    const limiter = createStencilLimiter(plan);

    // Aplicar rate limiting
    return withRateLimit(limiter, identifier, async () => {
      // 3. SISTEMA DE CRÉDITOS: Verificar se pode usar operação
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

      return await processGeneration(req, userId);
    });
  } catch (error: any) {
    console.error('Erro ao gerar estêncil:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar estêncil' },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar geração
async function processGeneration(req: Request, userId: string) {
  // Buscar ou criar usuário (para compatibilidade)
  const user = await getOrCreateUser(userId);

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Processar requisição
  const { image, style, promptDetails } = await req.json();

  if (!image) {
    return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
  }

  // VALIDAÇÃO: Garantir que style é um valor válido
  const validStyles = ['standard', 'perfect_lines'] as const;
  const selectedStyle = validStyles.includes(style) ? style : 'standard';
  
  // Log para debug - verificar qual modo foi selecionado
  console.log(`[API Stencil] Modo selecionado: ${selectedStyle} (recebido: ${style})`);

  // Gerar estêncil com o modo VALIDADO
  const stencilImage = await generateStencilFromImage(image, promptDetails, selectedStyle);

  // CONSUMIR CRÉDITO/LIMITE após geração bem-sucedida
  const consumeResult = await consumeOperation(userId, 'topographic');

  if (!consumeResult.success) {
    console.error('Erro ao consumir operação:', consumeResult.error);
    // Não bloquear a resposta, apenas logar
  }

  // Registrar uso de IA no ai_usage (legacy - para compatibilidade)
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
}

export const maxDuration = 60;
