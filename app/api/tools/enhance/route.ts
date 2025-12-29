import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { enhanceImage } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabase';
import { checkToolsLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

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

    // Buscar usuário completo (precisa do UUID user.id)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, is_paid, subscription_status, tools_unlocked')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 🔓 BYPASS PARA ADMINS - acesso ilimitado
    const userIsAdmin = await checkIsAdmin(userId);

    if (!userIsAdmin) {
      // Verificar assinatura (apenas para não-admins)
      if (!userData.is_paid || userData.subscription_status !== 'active') {
        return NextResponse.json({
          error: 'Assinatura necessária',
          message: 'Assine o plano básico primeiro.',
          requiresSubscription: true,
          subscriptionType: 'subscription'
        }, { status: 403 });
      }

      // Verificar ferramentas desbloqueadas (apenas para não-admins)
      if (!userData.tools_unlocked) {
        return NextResponse.json({
          error: 'Ferramentas premium não desbloqueadas',
          message: 'Desbloqueie as ferramentas premium por R$ 50.',
          requiresSubscription: true,
          subscriptionType: 'tools'
        }, { status: 403 });
      }

      // ✅ VERIFICAR LIMITE DE USO (100/500 por plano)
      const limitCheck = await checkToolsLimit(userData.id);

      if (!limitCheck.allowed) {
        const message = getLimitMessage('tool_usage', limitCheck.limit, limitCheck.resetDate);
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
    }

    const { image, targetDpi, widthCm, heightCm } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    console.log('[Enhance API] Iniciando enhancement:', {
      imageLength: image.length,
      targetDpi,
      widthCm,
      heightCm,
      userIsAdmin
    });

    // Aprimorar imagem
    const enhancedImage = await enhanceImage(image);

    console.log('[Enhance API] Enhancement concluído:', {
      enhancedImageLength: enhancedImage?.length,
      hasImage: !!enhancedImage
    });

    // ✅ REGISTRAR USO após operação bem-sucedida (exceto admins)
    if (!userIsAdmin) {
      await recordUsage({
        userId: userData.id,
        type: 'tool_usage',
        operationType: 'enhance_image',
        metadata: {
          tool: 'enhance',
          operation: 'enhance_image'
        }
      });
    }

    return NextResponse.json({ image: enhancedImage });
  } catch (error: any) {
    console.error('Erro ao aprimorar imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao aprimorar imagem' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;

// Configuração para aumentar o limite do body (Next.js)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
