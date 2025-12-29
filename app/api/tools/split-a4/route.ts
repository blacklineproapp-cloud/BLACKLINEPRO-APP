import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrCreateUser, isAdmin as checkIsAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateStencilFromImage } from '@/lib/gemini';
import { checkToolsLimit, recordUsage, getLimitMessage } from '@/lib/billing/limits';
import { apiLimiter, getRateLimitIdentifier } from '@/lib/rate-limit';
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

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlipTransform {
  horizontal: boolean;
  vertical: boolean;
}

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
  userIsAdmin?: boolean; // Admin bypass
  croppedArea?: CropArea; // Área de crop da react-easy-crop (em pixels)
  rotation?: number; // Rotação em graus
  flip?: FlipTransform; // Flip horizontal/vertical
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
    userIsAdmin,
    croppedArea,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
  } = options;

  // ---------------------------------------------------------------------------
  // STEP 1: Preparar imagem no tamanho físico correto
  // ---------------------------------------------------------------------------

  // Validar imagem base64
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Imagem inválida ou não fornecida');
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  if (!cleanBase64 || cleanBase64.length < 100) {
    throw new Error('Imagem base64 inválida ou muito pequena');
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(cleanBase64, 'base64');
  } catch (error) {
    throw new Error('Falha ao decodificar base64: ' + error);
  }

  // Obter dimensões originais
  let metadata = await sharp(imageBuffer).metadata();
  let originalWidth = metadata.width!;
  let originalHeight = metadata.height!;

  // ---------------------------------------------------------------------------
  // STEP 1.5: Aplicar transformações (rotate, flip, crop) ANTES do resize
  // ---------------------------------------------------------------------------
  //
  // 🔍 DPI MAPPING (WYSIWYG Fix):
  // - Frontend ImageCropControl: Container 500px (escala visual ~100 DPI)
  // - Backend API: 300 DPI para impressão @ 1:1
  // - croppedArea já vem ESCALADO do frontend (page.tsx linhas 268-307)
  //   - Calcula scale = imagemOriginal / container
  //   - Multiplica x, y, width, height por scale
  // - Resultado: crop correto na imagem original em alta resolução
  // ---------------------------------------------------------------------------

  let sharpPipeline = sharp(imageBuffer);

  // 1. Aplicar rotação (se houver)
  if (rotation !== 0) {
    sharpPipeline = sharpPipeline.rotate(rotation, {
      background: { r: 255, g: 255, b: 255, alpha: 0 } // Fundo transparente
    });
  }

  // 2. Aplicar flip (se houver)
  if (flip.horizontal) {
    sharpPipeline = sharpPipeline.flop();
  }
  if (flip.vertical) {
    sharpPipeline = sharpPipeline.flip();
  }

  // Aplicar transformações até aqui para obter novas dimensões
  imageBuffer = await sharpPipeline.png().toBuffer();
  metadata = await sharp(imageBuffer).metadata();
  originalWidth = metadata.width!;
  originalHeight = metadata.height!;

  // 3. Aplicar crop (se houver)
  if (croppedArea) {

    // croppedArea vem em pixels absolutos da react-easy-crop
    const cropLeft = Math.max(0, Math.round(croppedArea.x));
    const cropTop = Math.max(0, Math.round(croppedArea.y));
    const cropWidth = Math.min(originalWidth - cropLeft, Math.round(croppedArea.width));
    const cropHeight = Math.min(originalHeight - cropTop, Math.round(croppedArea.height));

    imageBuffer = await sharp(imageBuffer)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight
      })
      .png()
      .toBuffer();

    // Atualizar dimensões após crop
    metadata = await sharp(imageBuffer).metadata();
    originalWidth = metadata.width!;
    originalHeight = metadata.height!;

  }

  // ✅ CORREÇÃO WYSIWYG: Se houver crop, o resultado deve preencher o GRID, não o tattooWidth original do fit:cover
  let actualTargetWidthCm = tattooWidthCm;
  let actualTargetHeightCm = tattooHeightCm;
  let actualOffsetXCm = offsetXCm;
  let actualOffsetYCm = offsetYCm;

  if (croppedArea) {
    // Calcular tamanho REAL do grid (área total a ser preenchida pelo crop)
    const gridCols = forcedCols || Math.ceil(tattooWidthCm / (paperWidthCm - overlapCm));
    const gridRows = forcedRows || Math.ceil(tattooHeightCm / (paperHeightCm - overlapCm));
    
    actualTargetWidthCm = gridCols * paperWidthCm - (gridCols - 1) * overlapCm;
    actualTargetHeightCm = gridRows * paperHeightCm - (gridRows - 1) * overlapCm;
    
    // Quando usamos o Crop do frontend, a imagem já está "encaixada" no grid na posição (0,0) do mosaico
    actualOffsetXCm = 0;
    actualOffsetYCm = 0;
  }

  let imageWidthPx = Math.round(actualTargetWidthCm * CM_TO_PX);
  let imageHeightPx = Math.round(actualTargetHeightCm * CM_TO_PX);

  // Resize para tamanho EXATO calculado pelo frontend
  let processedBuffer = await sharp(imageBuffer)
    .resize(imageWidthPx, imageHeightPx, {
      fit: 'fill',  // Força tamanho exato (proporção já foi mantida no cálculo do frontend)
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  // ---------------------------------------------------------------------------
  // STEP 2: Aplicar processamento Gemini se necessário
  // ---------------------------------------------------------------------------

  if (processMode === 'topographic' || processMode === 'perfect_lines') {

    const resizedBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;
    const stencilStyle = processMode === 'perfect_lines' ? 'perfect_lines' : 'standard';

    try {
      const stencilBase64 = await generateStencilFromImage(resizedBase64, '', stencilStyle);
      const cleanStencil = stencilBase64.replace(/^data:image\/\w+;base64,/, '');
      processedBuffer = Buffer.from(cleanStencil, 'base64');

      // CRITICAL: Recalcular metadata após Gemini
      const stencilMetadata = await sharp(processedBuffer).metadata();

      // Garantir que mantém as dimensões corretas
      if (stencilMetadata.width !== imageWidthPx || stencilMetadata.height !== imageHeightPx) {
        processedBuffer = await sharp(processedBuffer)
          .resize(imageWidthPx, imageHeightPx, {
            fit: 'fill',
            kernel: sharp.kernel.lanczos3
          })
          .png()
          .toBuffer();
      }

      // ✅ REGISTRAR USO após processamento Gemini bem-sucedido (exceto admins)
      if (userUuid && !userIsAdmin) {
        await recordUsage({
          userId: userUuid,
          type: 'tool_usage',
          operationType: 'split_with_gemini',
          metadata: {
            tool: 'split_a4',
            processMode: processMode,
            operation: 'split_with_gemini'
          }
        });
      }
    } catch (error) {
      console.error('❌ Gemini processing failed:', error);
      throw new Error(`Falha no processamento ${processMode}: ${error}`);
    }
  } else {
    // Reference mode: RÁPIDO, sem processamento AI

    // Registrar uso no modo reference (exceto admins)
    if (userUuid && !userIsAdmin) {
      await recordUsage({
        userId: userUuid,
        type: 'tool_usage',
        operationType: 'split_only',
        metadata: {
          tool: 'split_a4',
          processMode: 'reference',
          operation: 'split_only'
        }
      });
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

  // Offset em pixels
  const offsetXPx = Math.round(actualOffsetXCm * CM_TO_PX);
  const offsetYPx = Math.round(actualOffsetYCm * CM_TO_PX);

  // Área total necessária
  const totalWidthPx = offsetXPx + imageWidthPx;
  const totalHeightPx = offsetYPx + imageHeightPx;

  // Usar grid FIXO se fornecido (do frontend), senão calcular dinamicamente
  let cols: number;
  let rows: number;

  if (forcedCols !== undefined && forcedRows !== undefined) {
    cols = forcedCols;
    rows = forcedRows;
  } else {
    cols = Math.ceil(totalWidthPx / effectiveWidthPx);
    rows = Math.ceil(totalHeightPx / effectiveHeightPx);
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Gerar cada página
  // ---------------------------------------------------------------------------

  // Verificar dimensões reais do buffer processado
  const finalMetadata = await sharp(processedBuffer).metadata();
  let actualWidth = finalMetadata.width!;
  let actualHeight = finalMetadata.height!;

  // Se as dimensões não batem, usar as dimensões reais
  if (actualWidth !== imageWidthPx || actualHeight !== imageHeightPx) {
    imageWidthPx = actualWidth;
    imageHeightPx = actualHeight;

    // Recalcular área total
    const totalWidthPx = offsetXPx + imageWidthPx;
    const totalHeightPx = offsetYPx + imageHeightPx;
  }

  const pages: Array<{
    imageData: string;
    position: { row: number; col: number };
    pageNumber: number;
  }> = [];

  let pageNumber = 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {

      // Posição da página no espaço global (canto superior esquerdo)
      const pageGlobalLeft = col * effectiveWidthPx;
      const pageGlobalTop = row * effectiveHeightPx;
      const pageGlobalRight = pageGlobalLeft + paperWidthPx;
      const pageGlobalBottom = pageGlobalTop + paperHeightPx;

      // Posição da imagem no espaço global
      const imageGlobalLeft = offsetXPx;
      const imageGlobalTop = offsetYPx;
      const imageGlobalRight = imageGlobalLeft + imageWidthPx;
      const imageGlobalBottom = imageGlobalTop + imageHeightPx;

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

      // Validar bounds e ajustar se necessário
      let adjustedLeft = Math.max(0, Math.floor(srcLeft));
      let adjustedTop = Math.max(0, Math.floor(srcTop));
      let adjustedWidth = Math.floor(srcWidth);
      let adjustedHeight = Math.floor(srcHeight);

      // Garantir que não ultrapasse os limites da imagem
      if (adjustedLeft + adjustedWidth > imageWidthPx) {
        adjustedWidth = imageWidthPx - adjustedLeft;
      }
      if (adjustedTop + adjustedHeight > imageHeightPx) {
        adjustedHeight = imageHeightPx - adjustedTop;
      }

      // Validar se ainda é válido
      if (
        adjustedLeft < 0 || adjustedTop < 0 ||
        adjustedWidth <= 0 || adjustedHeight <= 0 ||
        adjustedLeft >= imageWidthPx ||
        adjustedTop >= imageHeightPx
      ) {
        const base64Page = `data:image/png;base64,${paperCanvas.toString('base64')}`;
        pages.push({
          imageData: base64Page,
          position: { row, col },
          pageNumber: pageNumber++
        });
        continue;
      }

      if (adjustedWidth !== Math.floor(srcWidth) || adjustedHeight !== Math.floor(srcHeight)) {
      }

      // Posição onde colar no papel (0,0 = canto do papel)
      const dstLeft = intersectLeft - pageGlobalLeft;
      const dstTop = intersectTop - pageGlobalTop;

      // Extrair parte da imagem usando valores ajustados
      const croppedImage = await sharp(processedBuffer)
        .extract({
          left: adjustedLeft,
          top: adjustedTop,
          width: adjustedWidth,
          height: adjustedHeight,
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
      forcedRows,
      croppedArea,
      rotation = 0,
      flip = { horizontal: false, vertical: false }
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
      croppedArea?: CropArea;
      rotation?: number;
      flip?: FlipTransform;
    } = await req.json();

    // ✅ VERIFICAR LIMITE DE USO se usar Gemini (100/500 por plano)
    if (!userIsAdmin && processMode !== 'reference') {
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
      userIsAdmin,
      croppedArea,
      rotation,
      flip
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
