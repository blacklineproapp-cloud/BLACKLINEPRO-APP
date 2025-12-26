/**
 * Sistema de Validação de Qualidade de Imagens em Tempo Real
 *
 * Verifica se a imagem/stencil está adequada para impressão profissional
 */

export interface QualityValidation {
  isValid: boolean;           // Se passou em todas as validações
  score: number;              // Score geral (0-100)
  warnings: string[];         // Avisos não-críticos
  errors: string[];           // Erros críticos
  checks: {
    hasContent: boolean;      // Não está em branco
    hasMinResolution: boolean; // DPI >= 150
    hasMinContrast: boolean;   // Contraste >= 30
    isPrintable: boolean;      // Qualidade suficiente para impressão
  };
  metadata: {
    width: number;
    height: number;
    estimatedDpi: number;
    contrastLevel: number;    // 0-100
    blackPixelsPercent: number; // % de pixels pretos
    whitePixelsPercent: number; // % de pixels brancos
  };
}

const MIN_DPI = 150;           // DPI mínimo para impressão
const MIN_CONTRAST = 30;        // Contraste mínimo aceitável
const MIN_CONTENT_PERCENT = 1;  // Mínimo 1% de conteúdo (não todo branco/preto)

/**
 * Analisa uma imagem e retorna validação de qualidade
 *
 * @param imageBase64 - Imagem em base64
 * @param targetWidthCm - Largura alvo em CM (para calcular DPI)
 * @param targetHeightCm - Altura alvo em CM (para calcular DPI)
 * @returns Resultado da validação
 */
export async function validateImageQuality(
  imageBase64: string,
  targetWidthCm?: number,
  targetHeightCm?: number
): Promise<QualityValidation> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Criar imagem para análise
    const imageData = await getImageData(imageBase64);
    const { width, height, data } = imageData;

    // 1. CHECK: Tem conteúdo (não está em branco)
    const { blackPercent, whitePercent, grayPercent } = analyzePixelDistribution(data);
    const hasContent = blackPercent > MIN_CONTENT_PERCENT && whitePercent < 99;

    if (!hasContent) {
      errors.push('Imagem parece estar em branco ou sem conteúdo');
    } else if (blackPercent < 5) {
      warnings.push('Stencil tem pouco conteúdo (muito claro)');
    } else if (blackPercent > 95) {
      warnings.push('Stencil tem muito conteúdo (muito escuro)');
    }

    // 2. CHECK: Resolução mínima (DPI)
    let estimatedDpi = 300; // Padrão se não fornecer dimensões
    let hasMinResolution = true;

    if (targetWidthCm || targetHeightCm) {
      if (targetWidthCm) {
        estimatedDpi = Math.round((width / targetWidthCm) * 2.54);
      } else if (targetHeightCm) {
        estimatedDpi = Math.round((height / targetHeightCm) * 2.54);
      }

      hasMinResolution = estimatedDpi >= MIN_DPI;

      if (!hasMinResolution) {
        errors.push(`DPI muito baixo (${estimatedDpi}). Mínimo: ${MIN_DPI} DPI`);
      } else if (estimatedDpi < 200) {
        warnings.push(`DPI abaixo do ideal (${estimatedDpi}). Recomendado: 300 DPI`);
      }
    }

    // 3. CHECK: Contraste mínimo
    const contrastLevel = calculateContrast(data);
    const hasMinContrast = contrastLevel >= MIN_CONTRAST;

    if (!hasMinContrast) {
      errors.push(`Contraste insuficiente (${contrastLevel}). Mínimo: ${MIN_CONTRAST}`);
    } else if (contrastLevel < 50) {
      warnings.push('Contraste baixo. Considere aumentar para melhor impressão');
    }

    // 4. CHECK: Printabilidade (combinação de fatores)
    const isPrintable =
      hasContent &&
      hasMinResolution &&
      hasMinContrast &&
      blackPercent >= 2 &&  // Pelo menos 2% de conteúdo
      whitePercent >= 2;     // Pelo menos 2% de background

    if (!isPrintable && !errors.length) {
      errors.push('Imagem não está adequada para impressão profissional');
    }

    // Calcular score geral (0-100)
    let score = 0;
    if (hasContent) score += 25;
    if (hasMinResolution) score += 25;
    if (hasMinContrast) score += 25;
    if (isPrintable) score += 25;

    // Ajustar score por qualidade
    if (estimatedDpi >= 300) score += 5;
    if (contrastLevel >= 70) score += 5;
    if (blackPercent >= 10 && blackPercent <= 60) score += 5; // Conteúdo balanceado

    score = Math.min(100, score);

    const validation: QualityValidation = {
      isValid: errors.length === 0,
      score,
      warnings,
      errors,
      checks: {
        hasContent,
        hasMinResolution,
        hasMinContrast,
        isPrintable
      },
      metadata: {
        width,
        height,
        estimatedDpi,
        contrastLevel,
        blackPixelsPercent: blackPercent,
        whitePixelsPercent: whitePercent
      }
    };

    console.log('[QualityValidator] Validação concluída:', {
      isValid: validation.isValid,
      score: validation.score,
      errorsCount: errors.length,
      warningsCount: warnings.length
    });

    return validation;

  } catch (error: any) {
    console.error('[QualityValidator] Erro na validação:', error);
    return {
      isValid: false,
      score: 0,
      warnings: [],
      errors: ['Erro ao analisar imagem: ' + error.message],
      checks: {
        hasContent: false,
        hasMinResolution: false,
        hasMinContrast: false,
        isPrintable: false
      },
      metadata: {
        width: 0,
        height: 0,
        estimatedDpi: 0,
        contrastLevel: 0,
        blackPixelsPercent: 0,
        whitePixelsPercent: 0
      }
    };
  }
}

/**
 * Obtém ImageData de uma imagem base64 (client-side)
 */
function getImageData(imageBase64: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto 2D'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem para análise'));
    };

    img.src = imageBase64;
  });
}

/**
 * Analisa distribuição de pixels (preto/branco/cinza)
 */
function analyzePixelDistribution(data: Uint8ClampedArray): {
  blackPercent: number;
  whitePercent: number;
  grayPercent: number;
} {
  let blackCount = 0;
  let whiteCount = 0;
  let grayCount = 0;

  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calcular brilho médio
    const brightness = (r + g + b) / 3;

    if (brightness < 50) {
      blackCount++;
    } else if (brightness > 205) {
      whiteCount++;
    } else {
      grayCount++;
    }
  }

  return {
    blackPercent: Number(((blackCount / totalPixels) * 100).toFixed(2)),
    whitePercent: Number(((whiteCount / totalPixels) * 100).toFixed(2)),
    grayPercent: Number(((grayCount / totalPixels) * 100).toFixed(2))
  };
}

/**
 * Calcula nível de contraste (0-100)
 */
function calculateContrast(data: Uint8ClampedArray): number {
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brightness = (r + g + b) / 3;

    if (brightness < minBrightness) minBrightness = brightness;
    if (brightness > maxBrightness) maxBrightness = brightness;
  }

  // Contraste = diferença entre mais claro e mais escuro
  const contrast = maxBrightness - minBrightness;

  // Normalizar para 0-100
  return Math.round((contrast / 255) * 100);
}

/**
 * Validação rápida (apenas verifica se não está em branco)
 */
export async function quickValidate(imageBase64: string): Promise<boolean> {
  try {
    const imageData = await getImageData(imageBase64);
    const { blackPercent, whitePercent } = analyzePixelDistribution(imageData.data);

    return blackPercent > MIN_CONTENT_PERCENT && whitePercent < 99;
  } catch {
    return false;
  }
}
