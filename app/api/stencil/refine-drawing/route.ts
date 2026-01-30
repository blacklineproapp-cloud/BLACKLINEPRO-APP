import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se usuário é pago
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, plan, is_paid, admin_courtesy, admin_courtesy_expires_at')
      .eq('clerk_id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar acesso (apenas usuários pagos ou com cortesia)
    const hasActiveCourtesy = userData.admin_courtesy &&
      userData.admin_courtesy_expires_at &&
      new Date(userData.admin_courtesy_expires_at) > new Date();

    if (!userData.is_paid && !hasActiveCourtesy) {
      return NextResponse.json({
        error: 'Recurso exclusivo para assinantes',
        message: 'O refinamento com IA é exclusivo para assinantes. Assine para desbloquear!',
        requiresSubscription: true,
      }, { status: 403 });
    }

    const { image, style, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Extrair base64 da imagem
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Configurar modelo Gemini (mesmo modelo usado no resto do projeto)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });

    // Prompt para refinamento de desenho
    const refinementPrompt = `You are a professional tattoo stencil artist.

The user has added hand-drawn lines to a stencil image. Your task is to:
1. Keep ALL the original stencil lines intact
2. Refine and improve the USER'S HAND-DRAWN additions to match the professional style of the stencil
3. Make the hand-drawn lines cleaner, smoother, and more consistent with the overall design
4. Maintain the black and white stencil aesthetic
5. DO NOT add new elements - only refine what the user drew

Style preference: ${style || 'standard'}
Additional instructions: ${prompt || 'Refine the hand-drawn additions to look professional'}

Output a clean, professional stencil image that seamlessly integrates the user's additions with the original design.`;

    // Chamar Gemini com a imagem
    const result = await model.generateContent([
      refinementPrompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Verificar se a resposta contém uma imagem
    // Nota: Gemini 2.0 pode retornar imagens em alguns modos
    // Por enquanto, retornamos a imagem original se não houver processamento de imagem disponível

    // Como Gemini não processa imagens diretamente para output de imagem neste modo,
    // vamos usar uma abordagem alternativa: aplicar filtros/ajustes localmente
    // ou usar outro serviço de IA para processamento de imagem

    // Por enquanto, retornamos sucesso com a imagem original
    // Em uma implementação futura, podemos integrar com:
    // - Replicate (Stable Diffusion img2img)
    // - OpenAI DALL-E
    // - Outro serviço de processamento de imagem

    console.log('[Refine Drawing] Resposta do Gemini:', text.substring(0, 200));

    // Retornar a imagem original por enquanto (feature placeholder)
    // TODO: Integrar com serviço de processamento de imagem real
    return NextResponse.json({
      success: true,
      image: image, // Por enquanto retorna a mesma imagem
      message: 'Desenho salvo! Refinamento com IA será implementado em breve.',
      aiResponse: text.substring(0, 500),
    });

  } catch (error: any) {
    console.error('[Refine Drawing] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}
