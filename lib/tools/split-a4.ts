/**
 * Split A4 - Lógica de processamento de imagem para divisão em páginas A4
 *
 * Extraído de app/api/tools/split-a4/route.ts para separar
 * lógica de negócio (processamento de imagem) do HTTP handler.
 *
 * Responsabilidades:
 * - Transformações de imagem (rotate, flip, crop)
 * - Redimensionamento para escala física (cm → px @ 300 DPI)
 * - Processamento Gemini (topographic, perfect_lines, anime)
 * - Grid de páginas com overlap
 * - Composição final de cada página A4
 */

import sharp from 'sharp';
import { generateStencilFromImage } from '@/lib/gemini';
import { recordUsage } from '@/lib/billing/limits';
import { BRL_COST } from '@/lib/billing/costs';
import { logger } from '@/lib/logger';

// =============================================================================
// CONSTANTES FÍSICAS (IMPRESSÃO REAL)
// =============================================================================
const DPI = 300;
const CM_TO_PX = DPI / 2.54; // 1 cm = 118.11 pixels @ 300 DPI

// =============================================================================
// TIPOS
// =============================================================================

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlipTransform {
  horizontal: boolean;
  vertical: boolean;
}

export interface SplitOptions {
  imageBase64: string;
  tattooWidthCm: number;
  tattooHeightCm: number;
  paperWidthCm: number;
  paperHeightCm: number;
  overlapCm: number;
  offsetXCm: number;
  offsetYCm: number;
  processMode: 'reference' | 'topographic' | 'perfect_lines' | 'anime';
  forcedCols?: number;
  forcedRows?: number;
  userUuid?: string;
  userIsAdmin?: boolean;
  croppedArea?: CropArea;
  rotation?: number;
  flip?: FlipTransform;
}

export interface SplitPage {
  imageData: string;
  position: { row: number; col: number };
  pageNumber: number;
}

export interface SplitResult {
  pages: SplitPage[];
  gridInfo: {
    cols: number;
    rows: number;
    paperSizeCm: { width: number; height: number };
  };
}

// =============================================================================
// STEP 1: Preparar e transformar imagem
// =============================================================================

async function decodeAndValidateImage(imageBase64: string): Promise<Buffer> {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Imagem inválida ou não fornecida');
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  if (!cleanBase64 || cleanBase64.length < 100) {
    throw new Error('Imagem base64 inválida ou muito pequena');
  }

  try {
    return Buffer.from(cleanBase64, 'base64');
  } catch (error) {
    throw new Error('Falha ao decodificar base64: ' + error);
  }
}

async function applyTransformations(
  imageBuffer: Buffer,
  rotation: number,
  flip: FlipTransform,
  croppedArea?: CropArea
): Promise<{ buffer: Buffer; width: number; height: number }> {
  let pipeline = sharp(imageBuffer);

  // 1. Rotação
  if (rotation !== 0) {
    pipeline = pipeline.rotate(rotation, {
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    });
  }

  // 2. Flip
  if (flip.horizontal) pipeline = pipeline.flop();
  if (flip.vertical) pipeline = pipeline.flip();

  let buffer = await pipeline.png().toBuffer();
  let metadata = await sharp(buffer).metadata();
  let width = metadata.width!;
  let height = metadata.height!;

  // 3. Crop
  if (croppedArea) {
    const cropLeft = Math.max(0, Math.round(croppedArea.x));
    const cropTop = Math.max(0, Math.round(croppedArea.y));
    const cropWidth = Math.min(width - cropLeft, Math.round(croppedArea.width));
    const cropHeight = Math.min(height - cropTop, Math.round(croppedArea.height));

    buffer = await sharp(buffer)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .png()
      .toBuffer();

    metadata = await sharp(buffer).metadata();
    width = metadata.width!;
    height = metadata.height!;
  }

  return { buffer, width, height };
}

// =============================================================================
// STEP 2: Calcular dimensões com crop adjustment
// =============================================================================

function calculateTargetDimensions(options: SplitOptions): {
  targetWidthCm: number;
  targetHeightCm: number;
  offsetXCm: number;
  offsetYCm: number;
} {
  const {
    tattooWidthCm, tattooHeightCm,
    paperWidthCm, paperHeightCm,
    overlapCm, offsetXCm, offsetYCm,
    forcedCols, forcedRows, croppedArea
  } = options;

  if (!croppedArea) {
    return { targetWidthCm: tattooWidthCm, targetHeightCm: tattooHeightCm, offsetXCm, offsetYCm };
  }

  // Quando há crop, a imagem preenche o grid inteiro
  const gridCols = forcedCols || Math.ceil(tattooWidthCm / (paperWidthCm - overlapCm));
  const gridRows = forcedRows || Math.ceil(tattooHeightCm / (paperHeightCm - overlapCm));

  return {
    targetWidthCm: gridCols * paperWidthCm - (gridCols - 1) * overlapCm,
    targetHeightCm: gridRows * paperHeightCm - (gridRows - 1) * overlapCm,
    offsetXCm: 0,
    offsetYCm: 0,
  };
}

// =============================================================================
// STEP 3: Processamento Gemini (stencil)
// =============================================================================

async function applyGeminiProcessing(
  processedBuffer: Buffer,
  targetWidthPx: number,
  targetHeightPx: number,
  processMode: string,
  userUuid: string,
  userIsAdmin?: boolean
): Promise<Buffer> {
  const resizedBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;
  const stencilStyle = processMode === 'anime' ? 'anime' : processMode === 'perfect_lines' ? 'perfect_lines' : 'standard';

  try {
    const stencilBase64 = await generateStencilFromImage(resizedBase64, '', stencilStyle);
    const cleanStencil = stencilBase64.replace(/^data:image\/\w+;base64,/, '');
    let result: Buffer = Buffer.from(cleanStencil, 'base64');

    // Garantir dimensões corretas
    const stencilMeta = await sharp(result).metadata();
    if (stencilMeta.width !== targetWidthPx || stencilMeta.height !== targetHeightPx) {
      result = await sharp(result)
        .resize(targetWidthPx, targetHeightPx, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer() as Buffer;
    }

    // Registrar uso
    await recordUsage({
      userId: userUuid,
      type: 'tool_usage',
      operationType: 'split_with_gemini',
      cost: BRL_COST.split_a4,
      metadata: { tool: 'split_a4', processMode, operation: 'split_with_gemini', is_admin: userIsAdmin }
    });

    return result;
  } catch (error) {
    logger.error('[Split A4] Gemini processing failed', error);
    throw new Error(`Falha no processamento ${processMode}: ${error}`);
  }
}

// =============================================================================
// STEP 4: Gerar grid de páginas
// =============================================================================

async function generatePages(
  processedBuffer: Buffer,
  imageWidthPx: number,
  imageHeightPx: number,
  paperWidthPx: number,
  paperHeightPx: number,
  overlapPx: number,
  offsetXPx: number,
  offsetYPx: number,
  cols: number,
  rows: number
): Promise<SplitPage[]> {
  const effectiveWidthPx = paperWidthPx - overlapPx;
  const effectiveHeightPx = paperHeightPx - overlapPx;
  const pages: SplitPage[] = [];
  let pageNumber = 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pageGlobalLeft = col * effectiveWidthPx;
      const pageGlobalTop = row * effectiveHeightPx;
      const pageGlobalRight = pageGlobalLeft + paperWidthPx;
      const pageGlobalBottom = pageGlobalTop + paperHeightPx;

      const imageGlobalLeft = offsetXPx;
      const imageGlobalTop = offsetYPx;
      const imageGlobalRight = imageGlobalLeft + imageWidthPx;
      const imageGlobalBottom = imageGlobalTop + imageHeightPx;

      // Canvas branco
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
        pages.push({
          imageData: `data:image/png;base64,${paperCanvas.toString('base64')}`,
          position: { row, col },
          pageNumber: pageNumber++,
        });
        continue;
      }

      // Área de interseção
      const intersectLeft = Math.max(pageGlobalLeft, imageGlobalLeft);
      const intersectTop = Math.max(pageGlobalTop, imageGlobalTop);
      const intersectRight = Math.min(pageGlobalRight, imageGlobalRight);
      const intersectBottom = Math.min(pageGlobalBottom, imageGlobalBottom);

      // Coordenadas locais da imagem
      const adjustedLeft = Math.max(0, Math.floor(intersectLeft - imageGlobalLeft));
      const adjustedTop = Math.max(0, Math.floor(intersectTop - imageGlobalTop));
      let adjustedWidth = Math.floor(intersectRight - intersectLeft);
      let adjustedHeight = Math.floor(intersectBottom - intersectTop);

      // Clamp aos limites
      if (adjustedLeft + adjustedWidth > imageWidthPx) adjustedWidth = imageWidthPx - adjustedLeft;
      if (adjustedTop + adjustedHeight > imageHeightPx) adjustedHeight = imageHeightPx - adjustedTop;

      if (adjustedLeft < 0 || adjustedTop < 0 || adjustedWidth <= 0 || adjustedHeight <= 0 ||
          adjustedLeft >= imageWidthPx || adjustedTop >= imageHeightPx) {
        pages.push({
          imageData: `data:image/png;base64,${paperCanvas.toString('base64')}`,
          position: { row, col },
          pageNumber: pageNumber++,
        });
        continue;
      }

      // Posição no papel
      const dstLeft = intersectLeft - pageGlobalLeft;
      const dstTop = intersectTop - pageGlobalTop;

      // Extrair e compor
      const croppedImage = await sharp(processedBuffer)
        .extract({ left: adjustedLeft, top: adjustedTop, width: adjustedWidth, height: adjustedHeight })
        .toBuffer();

      const finalPage = await sharp(paperCanvas)
        .composite([{ input: croppedImage, left: Math.round(dstLeft), top: Math.round(dstTop) }])
        .png()
        .toBuffer();

      pages.push({
        imageData: `data:image/png;base64,${finalPage.toString('base64')}`,
        position: { row, col },
        pageNumber: pageNumber++,
      });
    }
  }

  return pages;
}

// =============================================================================
// FUNÇÃO PRINCIPAL (ORQUESTRADOR)
// =============================================================================

export async function splitImageIntoA4Pages(options: SplitOptions): Promise<SplitResult> {
  const {
    imageBase64,
    paperWidthCm, paperHeightCm,
    overlapCm,
    processMode,
    forcedCols, forcedRows,
    userUuid, userIsAdmin,
    croppedArea,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
  } = options;

  // Step 1: Decode + transformar imagem
  const rawBuffer = await decodeAndValidateImage(imageBase64);
  const transformed = await applyTransformations(rawBuffer, rotation, flip, croppedArea);

  // Step 2: Calcular dimensões-alvo
  const dims = calculateTargetDimensions(options);
  let imageWidthPx = Math.round(dims.targetWidthCm * CM_TO_PX);
  let imageHeightPx = Math.round(dims.targetHeightCm * CM_TO_PX);

  // Resize para tamanho físico
  let processedBuffer = await sharp(transformed.buffer)
    .resize(imageWidthPx, imageHeightPx, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  // Step 3: Processamento Gemini (se necessário)
  if (processMode === 'topographic' || processMode === 'perfect_lines' || processMode === 'anime') {
    processedBuffer = await applyGeminiProcessing(
      processedBuffer, imageWidthPx, imageHeightPx,
      processMode, userUuid!, userIsAdmin
    );
  } else if (userUuid) {
    await recordUsage({
      userId: userUuid,
      type: 'tool_usage',
      operationType: 'split_only',
      cost: BRL_COST.split_a4,
      metadata: { tool: 'split_a4', processMode: 'reference', operation: 'split_only', is_admin: userIsAdmin }
    });
  }

  // Step 4: Calcular grid
  const paperWidthPx = Math.round(paperWidthCm * CM_TO_PX);
  const paperHeightPx = Math.round(paperHeightCm * CM_TO_PX);
  const overlapPx = Math.round(overlapCm * CM_TO_PX);
  const effectiveWidthPx = paperWidthPx - overlapPx;
  const effectiveHeightPx = paperHeightPx - overlapPx;
  const offsetXPx = Math.round(dims.offsetXCm * CM_TO_PX);
  const offsetYPx = Math.round(dims.offsetYCm * CM_TO_PX);

  // Verificar dimensões finais
  const finalMeta = await sharp(processedBuffer).metadata();
  if (finalMeta.width !== imageWidthPx || finalMeta.height !== imageHeightPx) {
    imageWidthPx = finalMeta.width!;
    imageHeightPx = finalMeta.height!;
  }

  const totalWidthPx = offsetXPx + imageWidthPx;
  const totalHeightPx = offsetYPx + imageHeightPx;

  const cols = forcedCols ?? Math.ceil(totalWidthPx / effectiveWidthPx);
  const rows = forcedRows ?? Math.ceil(totalHeightPx / effectiveHeightPx);

  // Step 5: Gerar páginas
  const pages = await generatePages(
    processedBuffer, imageWidthPx, imageHeightPx,
    paperWidthPx, paperHeightPx, overlapPx,
    offsetXPx, offsetYPx, cols, rows
  );

  return {
    pages,
    gridInfo: { cols, rows, paperSizeCm: { width: paperWidthCm, height: paperHeightCm } },
  };
}
