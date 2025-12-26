import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateStencilFromImage } from '@/lib/gemini';
import { checkToolsLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import sharp from 'sharp';

// =============================================================================
// CONSTANTES FÍSICAS (IMPRESSÃO REAL)
// =============================================================================
const DPI = 300; // Alta qualidade de impressão
const CM_TO_PX = DPI / 2.54; // 1 cm = 118.11 pixels @ 300 DPI

// =============================================================================
// SISTEMA DE COORDENADAS (GHOSTLINE-STYLE)
// =============================================================================
//
// Tudo trabalha em COORDENADAS FÍSICAS (cm):
//
// Canvas Global:
//   - Origem (0, 0) no canto superior esquerdo
//   - Imagem existe em posição fixa
//   - A4 é uma "janela" que se move sobre a imagem
//
// Offset (offsetX, offsetY):
//   - Deslocamento da imagem em relação ao papel
//   - offsetX = 0, offsetY = 0 → imagem começa no canto do papel
//   - offsetX > 0 → imagem deslocada para DIREITA (aparece mais à esquerda no papel)
//
// Grid de páginas:
//   - Página [0,0] começa em offsetX, offsetY
//   - Páginas seguintes somam effectiveWidth/Height
//
// =============================================================================

interface SplitOptions {
  imageBase64: string;
  tattooWidthCm: number;
  tattooHeightCm: number;
  paperWidthCm: number;
  paperHeightCm: number;
  overlapCm: number;
  offsetXCm: number;
  offsetYCm: number;
  processMode: 'reference' | 'topographic' | 'perfect_lines';
  forcedCols?: number; // Grid fixo definido pelo usuário
  forcedRows?: number; // Grid fixo definido pelo usuário
  userUuid?: string; // UUID do usuário para registrar uso
  isAdmin?: boolean; // Admin bypass
}

async function splitImageIntoA4Pages(options: SplitOptions) {
  const {
    imageBase64,
    tattooWidthCm,
    tattooHeightCm,
    paperWidthCm,
    paperHeightCm,
    overlapCm,
    offsetXCm,
    offsetYCm,
    processMode,
    forcedCols,
    forcedRows,
    userUuid,
    isAdmin
  } = options;

  console.log('=== SPLIT A4 DEBUG ===');
  console.log('Tattoo size (cm):', tattooWidthCm, 'x', tattooHeightCm);
  console.log('Paper size (cm):', paperWidthCm, 'x', paperHeightCm);
  console.log('Offset (cm):', offsetXCm, offsetYCm);
  console.log('Process mode:', processMode);

  // ---------------------------------------------------------------------------
  // STEP 1: Preparar imagem no tamanho físico correto
  // ---------------------------------------------------------------------------

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  // Obter dimensões originais
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width!;
  const originalHeight = metadata.height!;

  console.log('Original image (px):', originalWidth, 'x', originalHeight);

  // ---------------------------------------------------------------------------
  // MAXIMIZAR TAMANHO: Caber dentro dos limites mantendo proporção
  // ---------------------------------------------------------------------------

  // Calcular proporção original
  const originalAspectRatio = originalWidth / originalHeight;
  console.log('Original aspect ratio:', originalAspectRatio.toFixed(3));

  // Usuário define limites máximos
  const maxWidthCm = tattooWidthCm;
  const maxHeightCm = tattooHeightCm;

  console.log('User requested max size (cm):', maxWidthCm, 'x', maxHeightCm);

  // Calcular qual dimensão usar para MAXIMIZAR sem distorcer
  const widthBasedHeightCm = maxWidthCm / originalAspectRatio;
  const heightBasedWidthCm = maxHeightCm * originalAspectRatio;

  let finalWidthCm: number;
  let finalHeightCm: number;

  if (widthBasedHeightCm <= maxHeightCm) {
    // Usar LARGURA completa, ajustar altura
    finalWidthCm = maxWidthCm;
    finalHeightCm = widthBasedHeightCm;
    console.log('Width-limited: using full width, adjusting height');
  } else {
    // Usar ALTURA completa, ajustar largura
    finalWidthCm = heightBasedWidthCm;
    finalHeightCm = maxHeightCm;
    console.log('Height-limited: using full height, adjusting width');
  }

  console.log('Final tattoo size (cm):', finalWidthCm.toFixed(2), 'x', finalHeightCm.toFixed(2));

  // Converter para pixels
  const imageWidthPx = Math.round(finalWidthCm * CM_TO_PX);
  const imageHeightPx = Math.round(finalHeightCm * CM_TO_PX);

  console.log('Final tattoo size (px):', imageWidthPx, 'x', imageHeightPx);

  // Resize mantendo proporção, usando o máximo de espaço
  let processedBuffer = await sharp(imageBuffer)
    .resize(imageWidthPx, imageHeightPx, {
      fit: 'inside',  // Mantém proporção, cabe dentro dos limites
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  // ---------------------------------------------------------------------------
  // STEP 2: Aplicar processamento Gemini se necessário
  // ---------------------------------------------------------------------------

  if (processMode === 'topographic' || processMode === 'perfect_lines') {
    console.log('Applying Gemini processing:', processMode);

    const resizedBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;
    const stencilStyle = processMode === 'perfect_lines' ? 'perfect_lines' : 'standard';

    try {
      const stencilBase64 = await generateStencilFromImage(resizedBase64, '', stencilStyle);
      const cleanStencil = stencilBase64.replace(/^data:image\/\w+;base64,/, '');
      processedBuffer = Buffer.from(cleanStencil, 'base64');

      // CRITICAL: Recalcular metadata após Gemini
      const stencilMetadata = await sharp(processedBuffer).metadata();
      console.log('After Gemini (px):', stencilMetadata.width, 'x', stencilMetadata.height);

      // Garantir que mantém as dimensões corretas
      if (stencilMetadata.width !== imageWidthPx || stencilMetadata.height !== imageHeightPx) {
        console.log('Resizing after Gemini to match original dimensions');
        processedBuffer = await sharp(processedBuffer)
          .resize(imageWidthPx, imageHeightPx, {
            fit: 'fill',
            kernel: sharp.kernel.lanczos3
          })
          .png()
          .toBuffer();
      }

      // ✅ REGISTRAR USO após processamento Gemini bem-sucedido (exceto admins)
      if (userUuid && !isAdmin) {
        await recordUsage({
          userId: userUuid,
          type: 'tool_usage',
          metadata: {
            tool: 'split_a4',
            processMode: processMode,
            operation: 'split_with_gemini'
          }
        });
      }
    } catch (error) {
      console.error('Gemini processing failed:', error);
      throw new Error(`Falha no processamento ${processMode}: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Calcular grid de páginas
  // ---------------------------------------------------------------------------

  const paperWidthPx = Math.round(paperWidthCm * CM_TO_PX);
  const paperHeightPx = Math.round(paperHeightCm * CM_TO_PX);
  const overlapPx = Math.round(overlapCm * CM_TO_PX);
  const effectiveWidthPx = paperWidthPx - overlapPx;
  const effectiveHeightPx = paperHeightPx - overlapPx;

  console.log('Paper (px):', paperWidthPx, 'x', paperHeightPx);
  console.log('Effective (px):', effectiveWidthPx, 'x', effectiveHeightPx);

  // Offset em pixels
  const offsetXPx = Math.round(offsetXCm * CM_TO_PX);
  const offsetYPx = Math.round(offsetYCm * CM_TO_PX);

  console.log('Offset (px):', offsetXPx, offsetYPx);

  // Área total necessária
  const totalWidthPx = offsetXPx + imageWidthPx;
  const totalHeightPx = offsetYPx + imageHeightPx;

  // Usar grid FIXO se fornecido (do frontend), senão calcular dinamicamente
  let cols: number;
  let rows: number;

  if (forcedCols !== undefined && forcedRows !== undefined) {
    cols = forcedCols;
    rows = forcedRows;
    console.log('Using FORCED grid from frontend:', cols, 'x', rows);
  } else {
    cols = Math.ceil(totalWidthPx / effectiveWidthPx);
    rows = Math.ceil(totalHeightPx / effectiveHeightPx);
    console.log('Calculated grid dynamically:', cols, 'x', rows);
  }

  console.log('Grid:', cols, 'x', rows, '=', cols * rows, 'pages');

  // ---------------------------------------------------------------------------
  // STEP 4: Gerar cada página
  // ---------------------------------------------------------------------------

  const pages: Array<{
    imageData: string;
    position: { row: number; col: number };
    pageNumber: number;
  }> = [];

  let pageNumber = 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      console.log(`\n--- Page ${pageNumber} [${row},${col}] ---`);

      // Posição da página no espaço global (canto superior esquerdo)
      const pageGlobalLeft = col * effectiveWidthPx;
      const pageGlobalTop = row * effectiveHeightPx;
      const pageGlobalRight = pageGlobalLeft + paperWidthPx;
      const pageGlobalBottom = pageGlobalTop + paperHeightPx;

      console.log('Page bounds (global px):', pageGlobalLeft, pageGlobalTop, pageGlobalRight, pageGlobalBottom);

      // Posição da imagem no espaço global
      const imageGlobalLeft = offsetXPx;
      const imageGlobalTop = offsetYPx;
      const imageGlobalRight = imageGlobalLeft + imageWidthPx;
      const imageGlobalBottom = imageGlobalTop + imageHeightPx;

      console.log('Image bounds (global px):', imageGlobalLeft, imageGlobalTop, imageGlobalRight, imageGlobalBottom);

      // Criar canvas branco do tamanho do papel
      const paperCanvas = await sharp({
        create: {
          width: paperWidthPx,
          height: paperHeightPx,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      }).png().toBuffer();

      // Verificar interseção
      const hasIntersection = (
        imageGlobalRight > pageGlobalLeft &&
        imageGlobalLeft < pageGlobalRight &&
        imageGlobalBottom > pageGlobalTop &&
        imageGlobalTop < pageGlobalBottom
      );

      if (!hasIntersection) {
        console.log('No intersection - blank page');
        const base64Page = `data:image/png;base64,${paperCanvas.toString('base64')}`;
        pages.push({
          imageData: base64Page,
          position: { row, col },
          pageNumber: pageNumber++
        });
        continue;
      }

      // Calcular área de interseção no espaço da IMAGEM (source)
      const intersectLeft = Math.max(pageGlobalLeft, imageGlobalLeft);
      const intersectTop = Math.max(pageGlobalTop, imageGlobalTop);
      const intersectRight = Math.min(pageGlobalRight, imageGlobalRight);
      const intersectBottom = Math.min(pageGlobalBottom, imageGlobalBottom);

      // Converter para coordenadas locais da imagem (0,0 = canto da imagem)
      const srcLeft = intersectLeft - imageGlobalLeft;
      const srcTop = intersectTop - imageGlobalTop;
      const srcWidth = intersectRight - intersectLeft;
      const srcHeight = intersectBottom - intersectTop;

      console.log('Extract from image (local px):', srcLeft, srcTop, srcWidth, srcHeight);

      // Validar bounds
      if (
        srcLeft < 0 || srcTop < 0 ||
        srcWidth <= 0 || srcHeight <= 0 ||
        srcLeft + srcWidth > imageWidthPx ||
        srcTop + srcHeight > imageHeightPx
      ) {
        console.log('Invalid bounds - blank page');
        const base64Page = `data:image/png;base64,${paperCanvas.toString('base64')}`;
        pages.push({
          imageData: base64Page,
          position: { row, col },
          pageNumber: pageNumber++
        });
        continue;
      }

      // Posição onde colar no papel (0,0 = canto do papel)
      const dstLeft = intersectLeft - pageGlobalLeft;
      const dstTop = intersectTop - pageGlobalTop;

      console.log('Paste on paper (local px):', dstLeft, dstTop);

      // Extrair parte da imagem
      const croppedImage = await sharp(processedBuffer)
        .extract({
          left: Math.round(srcLeft),
          top: Math.round(srcTop),
          width: Math.round(srcWidth),
          height: Math.round(srcHeight),
        })
        .toBuffer();

      // Compor no papel
      const finalPage = await sharp(paperCanvas)
        .composite([{
          input: croppedImage,
          left: Math.round(dstLeft),
          top: Math.round(dstTop),
        }])
        .png()
        .toBuffer();

      const base64Page = `data:image/png;base64,${finalPage.toString('base64')}`;
      pages.push({
        imageData: base64Page,
        position: { row, col },
        pageNumber: pageNumber++
      });

      console.log('✓ Page generated successfully');
    }
  }

  return {
    pages,
    gridInfo: {
      cols,
      rows,
      paperSizeCm: {
        width: paperWidthCm,
        height: paperHeightCm
      }
    }
  };
}

// Emails admin com acesso ilimitado
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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
    const userEmailLower = userData.email?.toLowerCase() || '';
    const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);

    if (!isAdmin) {
      // Verificar assinatura (apenas para não-admins)
      if (!userData.is_paid || userData.subscription_status !== 'active') {
        return NextResponse.json({
          error: 'Assinatura necessária',
          message: 'Assine o plano básico primeiro.',
          requiresSubscription: true,
          subscriptionType: 'subscription',
        }, { status: 403 });
      }

      // Verificar ferramentas desbloqueadas (apenas para não-admins)
      if (!userData.tools_unlocked) {
        return NextResponse.json({
          error: 'Ferramentas premium não desbloqueadas',
          message: 'Desbloqueie as ferramentas premium por R$ 50.',
          requiresSubscription: true,
          subscriptionType: 'tools',
        }, { status: 403 });
      }
    }

    const {
      image,
      tattooWidth,
      tattooHeight,
      paperWidth,
      paperHeight,
      overlap = 0.5,
      offsetX = 0,
      offsetY = 0,
      processMode = 'reference',
      forcedCols,
      forcedRows
    }: {
      image: string;
      tattooWidth: number;
      tattooHeight: number;
      paperWidth: number;
      paperHeight: number;
      overlap?: number;
      offsetX?: number;
      offsetY?: number;
      processMode?: 'reference' | 'topographic' | 'perfect_lines';
      forcedCols?: number;
      forcedRows?: number;
    } = await req.json();

    // ✅ VERIFICAR LIMITE DE USO se usar Gemini (100/500 por plano)
    if (!isAdmin && processMode !== 'reference') {
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

    if (!image || !tattooWidth || !tattooHeight || !paperWidth || !paperHeight) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Validar tamanhos
    if (tattooWidth < 1 || tattooWidth > 200 || tattooHeight < 1 || tattooHeight > 200) {
      return NextResponse.json({ error: 'Tamanho da tattoo inválido (1-200cm)' }, { status: 400 });
    }

    if (paperWidth < 10 || paperWidth > 100 || paperHeight < 10 || paperHeight > 100) {
      return NextResponse.json({ error: 'Tamanho de papel inválido' }, { status: 400 });
    }

    // Dividir imagem
    const result = await splitImageIntoA4Pages({
      imageBase64: image,
      tattooWidthCm: tattooWidth,
      tattooHeightCm: tattooHeight,
      paperWidthCm: paperWidth,
      paperHeightCm: paperHeight,
      overlapCm: overlap,
      offsetXCm: offsetX,
      offsetYCm: offsetY,
      processMode,
      forcedCols,
      forcedRows,
      userUuid: userData.id,
      isAdmin
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao dividir imagem:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao dividir imagem' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
