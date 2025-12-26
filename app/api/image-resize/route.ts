import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * API Route: Resize Inteligente de Imagens
 *
 * Redimensiona imagens mantendo qualidade profissional para impressão
 * - Upscale: Lanczos3 (melhor qualidade para aumentar)
 * - Downscale: Mitchell (melhor qualidade para reduzir)
 * - Input em CENTÍMETROS (unidade física real)
 * - Output em 300 DPI (padrão profissional)
 */

interface ResizeRequest {
  image: string;           // Base64 da imagem
  targetWidthCm?: number;  // Largura desejada em CM
  targetHeightCm?: number; // Altura desejada em CM
  dpi?: number;            // DPI de saída (padrão: 300)
  maintainAspect?: boolean; // Manter proporção (padrão: true)
}

interface ResizeResponse {
  image: string;           // Base64 da imagem processada
  metadata: {
    originalWidth: number;   // Largura original em pixels
    originalHeight: number;  // Altura original em pixels
    originalWidthCm: number; // Largura original em CM
    originalHeightCm: number; // Altura original em CM
    finalWidth: number;      // Largura final em pixels
    finalHeight: number;     // Altura final em pixels
    finalWidthCm: number;    // Largura final em CM
    finalHeightCm: number;   // Altura final em CM
    dpi: number;             // DPI usado
    wasUpscaled: boolean;    // Se houve upscale
    algorithm: string;       // Algoritmo usado
  };
}

// Converter CM para pixels baseado no DPI
function cmToPixels(cm: number, dpi: number): number {
  return Math.round(cm * (dpi / 2.54));
}

// Converter pixels para CM baseado no DPI
function pixelsToCm(pixels: number, dpi: number): number {
  return Number((pixels / (dpi / 2.54)).toFixed(2));
}

export async function POST(req: NextRequest) {
  try {
    // Parse do body
    let body: ResizeRequest;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('[ImageResize] Erro ao fazer parse do JSON:', parseError.message);
      return NextResponse.json({ error: 'JSON inválido no body da requisição' }, { status: 400 });
    }

    const { image, targetWidthCm, targetHeightCm, dpi = 300, maintainAspect = true } = body;

    // Validações
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Imagem não fornecida ou inválida' }, { status: 400 });
    }

    if (!targetWidthCm && !targetHeightCm) {
      return NextResponse.json({ error: 'Forneça pelo menos targetWidthCm ou targetHeightCm' }, { status: 400 });
    }

    if (dpi < 72 || dpi > 600) {
      return NextResponse.json({ error: 'DPI deve estar entre 72 e 600' }, { status: 400 });
    }

    console.log('[ImageResize] Iniciando resize:', {
      targetWidthCm,
      targetHeightCm,
      dpi,
      maintainAspect
    });

    // Extrair buffer da imagem base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Obter metadados da imagem original
    const sharpInstance = sharp(imageBuffer);
    const originalMetadata = await sharpInstance.metadata();

    if (!originalMetadata.width || !originalMetadata.height) {
      return NextResponse.json({ error: 'Não foi possível obter dimensões da imagem' }, { status: 400 });
    }

    const originalWidth = originalMetadata.width;
    const originalHeight = originalMetadata.height;
    const originalAspectRatio = originalWidth / originalHeight;

    // Calcular dimensões originais em CM (assumindo 300 DPI se não especificado)
    const originalDpi = originalMetadata.density || 300;
    const originalWidthCm = pixelsToCm(originalWidth, originalDpi);
    const originalHeightCm = pixelsToCm(originalHeight, originalDpi);

    console.log('[ImageResize] Imagem original:', {
      width: originalWidth,
      height: originalHeight,
      widthCm: originalWidthCm,
      heightCm: originalHeightCm,
      dpi: originalDpi
    });

    // Calcular dimensões finais em pixels
    let finalWidth: number;
    let finalHeight: number;

    if (maintainAspect) {
      // Manter proporção
      if (targetWidthCm) {
        finalWidth = cmToPixels(targetWidthCm, dpi);
        finalHeight = Math.round(finalWidth / originalAspectRatio);
      } else if (targetHeightCm) {
        finalHeight = cmToPixels(targetHeightCm, dpi);
        finalWidth = Math.round(finalHeight * originalAspectRatio);
      } else {
        return NextResponse.json({ error: 'Erro interno ao calcular dimensões' }, { status: 500 });
      }
    } else {
      // Não manter proporção (usar ambos ou preencher com valor calculado)
      if (targetWidthCm && targetHeightCm) {
        finalWidth = cmToPixels(targetWidthCm, dpi);
        finalHeight = cmToPixels(targetHeightCm, dpi);
      } else if (targetWidthCm) {
        finalWidth = cmToPixels(targetWidthCm, dpi);
        finalHeight = Math.round(finalWidth / originalAspectRatio);
      } else if (targetHeightCm) {
        finalHeight = cmToPixels(targetHeightCm, dpi);
        finalWidth = Math.round(finalHeight * originalAspectRatio);
      } else {
        return NextResponse.json({ error: 'Erro interno ao calcular dimensões' }, { status: 500 });
      }
    }

    // Determinar se é upscale ou downscale
    const totalPixelsOriginal = originalWidth * originalHeight;
    const totalPixelsFinal = finalWidth * finalHeight;
    const wasUpscaled = totalPixelsFinal > totalPixelsOriginal;

    // Escolher algoritmo apropriado
    // Lanczos3: Melhor para upscale (aumentar imagem)
    // Mitchell: Melhor para downscale (reduzir imagem)
    const kernel = wasUpscaled ? sharp.kernel.lanczos3 : sharp.kernel.mitchell;
    const algorithmName = wasUpscaled ? 'Lanczos3' : 'Mitchell';

    console.log('[ImageResize] Processando:', {
      finalWidth,
      finalHeight,
      wasUpscaled,
      algorithm: algorithmName
    });

    // Aplicar resize com algoritmo apropriado
    const resizedBuffer = await sharp(imageBuffer)
      .resize(finalWidth, finalHeight, {
        kernel,
        fit: 'fill' // Preencher exatamente as dimensões (já calculamos aspect ratio)
      })
      .withMetadata({
        density: dpi // Definir DPI nos metadados
      })
      .png({
        quality: 100,           // Qualidade máxima
        compressionLevel: 6,    // Compressão média (0=nenhuma, 9=máxima)
        palette: false          // Manter RGB completo
      })
      .toBuffer();

    // Converter resultado para base64
    const base64Result = `data:image/png;base64,${resizedBuffer.toString('base64')}`;

    // Calcular dimensões finais em CM
    const finalWidthCm = pixelsToCm(finalWidth, dpi);
    const finalHeightCm = pixelsToCm(finalHeight, dpi);

    // Montar resposta
    const response: ResizeResponse = {
      image: base64Result,
      metadata: {
        originalWidth,
        originalHeight,
        originalWidthCm,
        originalHeightCm,
        finalWidth,
        finalHeight,
        finalWidthCm,
        finalHeightCm,
        dpi,
        wasUpscaled,
        algorithm: algorithmName
      }
    };

    console.log('[ImageResize] ✅ Resize concluído:', {
      originalSize: `${originalWidth}x${originalHeight} (${originalWidthCm}x${originalHeightCm}cm)`,
      finalSize: `${finalWidth}x${finalHeight} (${finalWidthCm}x${finalHeightCm}cm)`,
      algorithm: algorithmName,
      sizeKB: Math.round(resizedBuffer.length / 1024)
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[ImageResize] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}
