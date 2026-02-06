import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { retryGeminiAPI } from '@/lib/retry';

// App Router: usar runtime nodejs para ter mais memória/limite
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos para processar IA

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Modelo otimizado para refinamento de desenhos
// Temperature baixa para manter fidelidade, mas permitir suavização
const refineModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.2,  // Baixa criatividade - apenas suavizar
    topP: 0.3,         // Conservador
    topK: 10,          // Poucas opções
  },
});

/**
 * Garante que a imagem final seja monocromática (preto e branco)
 */
async function enforceMonochrome(base64DataUri: string): Promise<string> {
  const cleanBase64 = base64DataUri.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const monoBuffer = await sharp(buffer)
    .greyscale()
    .png({ compressionLevel: 6 })
    .toBuffer();

  return `data:image/png;base64,${monoBuffer.toString('base64')}`;
}

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

    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Extrair base64 da imagem
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Prompt otimizado para suavizar traços pixelados/quadrados
    const refinementPrompt = `🎯 MISSION: SMOOTH AND REFINE HAND-DRAWN STROKES ON STENCIL

You are receiving a tattoo stencil image with HAND-DRAWN additions by the user.
The user's strokes may appear PIXELATED, JAGGED, or SQUARE-EDGED.

YOUR TASK:
1. IDENTIFY all hand-drawn strokes (they look rougher/more pixelated than the original stencil)
2. SMOOTH these strokes using professional vector-like curves
3. MAINTAIN the exact path and position of each stroke
4. KEEP the stroke thickness consistent
5. PRESERVE the original stencil lines EXACTLY as they are

TECHNICAL REQUIREMENTS:
- Convert pixelated/jagged edges to SMOOTH CURVES
- Apply anti-aliasing to all hand-drawn lines
- Make strokes look like they were drawn with a professional vector tool
- Bezier-curve smoothing on all rough edges
- NO new elements - only smooth existing strokes

OUTPUT:
- Black lines on white background
- PNG format
- Same dimensions as input
- Professional, clean stencil ready for tattoo transfer

⚠️ CRITICAL: Do NOT redraw or reinterpret the image. ONLY smooth the rough/pixelated strokes.
The goal is to make hand-drawn additions look as professional as the original stencil.

PROCESS THE IMAGE NOW:`;

    console.log('[Refine Drawing] Iniciando refinamento com Gemini...');

    // Usar retry logic igual ao generateStencilFromImage
    const refinedImage = await retryGeminiAPI(async () => {
      const result = await refineModel.generateContent([
        refinementPrompt,
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Data,
          },
        },
      ]);

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;

      if (parts) {
        for (const part of parts) {
          // @ts-ignore - Check for inline image data
          if (part.inlineData) {
            // @ts-ignore
            const rawImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            console.log('[Refine Drawing] ✅ Imagem refinada recebida do Gemini');
            // Garantir saída monocromática
            return await enforceMonochrome(rawImage);
          }
        }
      }

      // Se não retornou imagem, verificar se há texto de erro
      const text = response.text?.() || '';
      console.error('[Refine Drawing] Gemini não retornou imagem:', text.substring(0, 200));
      throw new Error('Modelo não retornou imagem refinada');
    }, 'Gemini Refine Drawing');

    return NextResponse.json({
      success: true,
      image: refinedImage,
      message: 'Desenho refinado com sucesso!',
    });

  } catch (error: any) {
    console.error('[Refine Drawing] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}
