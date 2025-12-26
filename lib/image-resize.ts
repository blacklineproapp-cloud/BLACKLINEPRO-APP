/**
 * Helper: Resize Inteligente de Imagens
 *
 * Utiliza o endpoint /api/image-resize para redimensionar imagens
 * com qualidade profissional (Lanczos3/Mitchell)
 */

interface ResizeOptions {
  targetWidthCm?: number;   // Largura desejada em CM
  targetHeightCm?: number;  // Altura desejada em CM
  dpi?: number;             // DPI de saída (padrão: 300)
  maintainAspect?: boolean; // Manter proporção (padrão: true)
}

interface ResizeMetadata {
  originalWidth: number;
  originalHeight: number;
  originalWidthCm: number;
  originalHeightCm: number;
  finalWidth: number;
  finalHeight: number;
  finalWidthCm: number;
  finalHeightCm: number;
  dpi: number;
  wasUpscaled: boolean;
  algorithm: string;
}

interface ResizeResult {
  image: string;
  metadata: ResizeMetadata;
}

/**
 * Redimensiona uma imagem mantendo qualidade profissional
 *
 * @param imageBase64 - Imagem em base64
 * @param options - Opções de redimensionamento
 * @returns Imagem redimensionada + metadados
 */
export async function resizeImage(
  imageBase64: string,
  options: ResizeOptions
): Promise<ResizeResult> {
  // Validações
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('Imagem inválida ou não fornecida');
  }

  if (!imageBase64.startsWith('data:image/')) {
    throw new Error('Formato de imagem inválido (esperado base64)');
  }

  if (!options.targetWidthCm && !options.targetHeightCm) {
    throw new Error('Forneça pelo menos targetWidthCm ou targetHeightCm');
  }

  console.log('[ResizeHelper] Enviando requisição:', {
    hasImage: !!imageBase64,
    imageLength: imageBase64.length,
    options
  });

  try {
    const response = await fetch('/api/image-resize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        ...options
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ResizeHelper] Erro da API:', data);
      throw new Error(data.error || 'Erro ao redimensionar imagem');
    }

    console.log('[ResizeHelper] ✅ Resize concluído:', {
      algorithm: data.metadata.algorithm,
      originalSize: `${data.metadata.originalWidthCm}x${data.metadata.originalHeightCm}cm`,
      finalSize: `${data.metadata.finalWidthCm}x${data.metadata.finalHeightCm}cm`,
      wasUpscaled: data.metadata.wasUpscaled
    });

    return data;

  } catch (error: any) {
    console.error('[ResizeHelper] Erro na requisição:', error);
    throw new Error(error.message || 'Erro ao comunicar com servidor');
  }
}

/**
 * Calcula dimensões finais mantendo aspect ratio
 * (útil para preview antes de fazer resize)
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidthCm?: number,
  targetHeightCm?: number,
  dpi: number = 300
): { widthCm: number; heightCm: number; widthPx: number; heightPx: number } {
  const aspectRatio = originalWidth / originalHeight;

  let finalWidthPx: number;
  let finalHeightPx: number;

  if (targetWidthCm) {
    finalWidthPx = Math.round(targetWidthCm * (dpi / 2.54));
    finalHeightPx = Math.round(finalWidthPx / aspectRatio);
  } else if (targetHeightCm) {
    finalHeightPx = Math.round(targetHeightCm * (dpi / 2.54));
    finalWidthPx = Math.round(finalHeightPx * aspectRatio);
  } else {
    throw new Error('Forneça pelo menos targetWidthCm ou targetHeightCm');
  }

  const finalWidthCm = Number((finalWidthPx / (dpi / 2.54)).toFixed(2));
  const finalHeightCm = Number((finalHeightPx / (dpi / 2.54)).toFixed(2));

  return {
    widthCm: finalWidthCm,
    heightCm: finalHeightCm,
    widthPx: finalWidthPx,
    heightPx: finalHeightPx
  };
}

/**
 * Converte CM para pixels
 */
export function cmToPixels(cm: number, dpi: number = 300): number {
  return Math.round(cm * (dpi / 2.54));
}

/**
 * Converte pixels para CM
 */
export function pixelsToCm(pixels: number, dpi: number = 300): number {
  return Number((pixels / (dpi / 2.54)).toFixed(2));
}

/**
 * Obtém dimensões de uma imagem base64
 */
export function getImageDimensions(imageBase64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };

    img.src = imageBase64;
  });
}
