import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * API Route: Ajustar Stencil com Sharp.js
 *
 * Aplica ajustes profissionais em stencils gerados:
 * - Intensidade (brightness, contrast, threshold, gamma)
 * - Transformações (rotation, flip, flop)
 * - Inversão de cores
 * - Limpeza (blur, sharpen)
 *
 * Processamento server-side mantendo qualidade 300 DPI
 */

// Tipos dos controles de ajuste
export interface AdjustControls {
  // Intensidade e contraste
  brightness?: number;      // -150 a +150 (padrão: 0)
  contrast?: number;         // -100 a +100 (padrão: 0)
  threshold?: number;        // 0 a 255 (padrão: null - desativado)
  gamma?: number;            // 1.0 a 3.0 (padrão: 1.0) - Sharp só aceita >= 1.0

  // Ferramentas Profissionais (Photoshop-style)
  posterize?: number;        // 2 a 255 níveis tonais (padrão: null - desativado)
  levels?: {                 // Ajuste fino de tons (substitui gamma limitado)
    inputBlack?: number;     // 0-254 (padrão: 0) - ponto de preto puro
    inputGray?: number;      // 0.1-9.99 (padrão: 1.0) - gamma dos meios-tons
    inputWhite?: number;     // 1-255 (padrão: 255) - ponto de branco puro
    outputBlack?: number;    // 0-254 (padrão: 0) - remapear preto para
    outputWhite?: number;    // 1-255 (padrão: 255) - remapear branco para
  };
  findEdges?: boolean;       // Detectar bordas (padrão: false)
  edgeStrength?: number;     // 0-100 (padrão: 50) - força da detecção
  clarity?: number;          // -100 a +100 (padrão: 0) - contraste local

  // Transformações
  rotation?: number;         // -180 a +180 graus (padrão: 0)
  flipHorizontal?: boolean;  // Espelhar horizontal (padrão: false)
  flipVertical?: boolean;    // Espelhar vertical (padrão: false)

  // Inversão
  invert?: boolean;          // Inverter cores (padrão: false)

  // Limpeza (opcional)
  removeNoise?: boolean;     // Remover ruído com blur (padrão: false)
  noiseReduction?: number;   // 0 a 10 (sigma do blur) (padrão: 1)
  sharpen?: boolean;         // Aplicar sharpen (padrão: false)
  sharpenAmount?: number;    // 0 a 10 (padrão: 1)
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Parse JSON com tratamento de erro
    let body;
    try {
      body = await req.json();
      console.log('[Adjust] Request recebido, body keys:', Object.keys(body || {}));
    } catch (parseError: any) {
      console.error('[Adjust] Erro ao fazer parse do JSON:', parseError.message);
      return NextResponse.json(
        { error: 'JSON inválido no body da requisição' },
        { status: 400 }
      );
    }

    const image = body?.image;
    const controls = body?.controls || {};

    if (!image) {
      console.error('[Adjust] Imagem não fornecida no body');
      return NextResponse.json(
        { error: 'Imagem não fornecida' },
        { status: 400 }
      );
    }

    if (!controls || typeof controls !== 'object') {
      console.error('[Adjust] Controles inválidos:', typeof controls);
      return NextResponse.json(
        { error: 'Controles inválidos' },
        { status: 400 }
      );
    }

    // Converter base64 para Buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Validar se é uma imagem válida
    try {
      const metadata = await sharp(imageBuffer).metadata();
      console.log('[Adjust] Imagem recebida:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: Math.round(imageBuffer.length / 1024) + 'KB'
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Imagem inválida ou corrompida' },
        { status: 400 }
      );
    }

    // ===========================================================================
    // PROCESSAR AJUSTES COM SHARP.JS
    // ===========================================================================

    let processed = sharp(imageBuffer);

    // Extrair valores com defaults seguros
    const brightness = controls.brightness ?? 0;
    const contrast = controls.contrast ?? 0;
    const threshold = controls.threshold ?? 128;
    const gamma = controls.gamma ?? 1.0;
    const rotation = controls.rotation ?? 0;
    const flipHorizontal = controls.flipHorizontal ?? false;
    const flipVertical = controls.flipVertical ?? false;
    const invert = controls.invert ?? false;
    const removeNoise = controls.removeNoise ?? false;
    const noiseReduction = controls.noiseReduction ?? 1;
    const sharpen = controls.sharpen ?? false;
    const sharpenAmount = controls.sharpenAmount ?? 1;

    // Ferramentas profissionais
    const posterize = controls.posterize ?? null;
    const levels = controls.levels ?? null;
    const findEdges = controls.findEdges ?? false;
    const edgeStrength = controls.edgeStrength ?? 50;
    const clarity = controls.clarity ?? 0;

    // 1. SHARPEN PRIMEIRO (melhora qualidade antes de outros ajustes)
    if (sharpen && sharpenAmount > 0) {
      const sigma = Math.max(0.3, Math.min(3, sharpenAmount)); // Limitar para não exagerar
      processed = processed.sharpen({ sigma });
      console.log('[Adjust] Sharpen aplicado (sigma):', sigma);
    }

    // 2. REMOVE NOISE (suavizar antes de ajustar tons)
    if (removeNoise && noiseReduction > 0) {
      const sigma = Math.max(0.3, Math.min(2, noiseReduction)); // Blur suave
      processed = processed.blur(sigma);
      console.log('[Adjust] Noise reduction aplicado (sigma):', sigma);
    }

    // 3. POSTERIZE (Redução de níveis tonais - estilo Photoshop)
    // Simplifica a imagem reduzindo o número de tons disponíveis
    if (posterize !== null && posterize >= 2 && posterize <= 255) {
      const levels = Math.max(2, Math.min(255, Math.round(posterize)));

      // Sharp não tem posterize nativo, mas podemos emular com normalise + threshold
      // Abordagem: processar buffer raw aplicando posterização pixel a pixel
      const bufferData = await processed.raw().toBuffer({ resolveWithObject: true });
      const { data, info } = bufferData;

      // Aplicar posterização: quantizar cada pixel
      const step = 256 / levels;
      for (let i = 0; i < data.length; i++) {
        const value = data[i];
        data[i] = Math.floor(value / step) * step;
      }

      // Reconstruir imagem
      processed = sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels
        }
      });

      console.log('[Adjust] Posterize aplicado:', { levels, step });
    }

    // 4. LEVELS (Ajuste fino de tons - estilo Photoshop)
    // Input: Define range de entrada (shadows, midtones, highlights)
    // Output: Remapeia range de saída
    if (levels !== null && typeof levels === 'object') {
      let inputBlack = Math.max(0, Math.min(254, levels.inputBlack ?? 0));
      let inputWhite = Math.max(1, Math.min(255, levels.inputWhite ?? 255));
      const inputGray = Math.max(1.0, Math.min(3.0, levels.inputGray ?? 1.0)); // Sharp só aceita 1.0-3.0
      const outputBlack = Math.max(0, Math.min(254, levels.outputBlack ?? 0));
      const outputWhite = Math.max(1, Math.min(255, levels.outputWhite ?? 255));

      // VALIDAÇÃO CRÍTICA: Input Black DEVE ser menor que Input White
      if (inputBlack >= inputWhite) {
        console.warn('[Adjust] Levels - Input Black >= Input White detectado, corrigindo...', {
          inputBlack,
          inputWhite
        });
        // Forçar diferença mínima de 1 pixel
        if (inputBlack >= inputWhite) {
          inputWhite = Math.min(255, inputBlack + 1);
        }
      }

      // PHASE 1: Input Levels usando linear() ao invés de normalise()
      // Sharp normalise() espera percentuais (1-100), não valores absolutos
      // Vamos usar linear() para aplicar input levels corretamente
      if (inputBlack !== 0 || inputWhite !== 255) {
        // Formula para expandir range de [inputBlack, inputWhite] para [0, 255]:
        // output = (input - inputBlack) * (255 / (inputWhite - inputBlack))
        // Convertendo para linear(a, b): a * input + b
        // a = 255 / (inputWhite - inputBlack)
        // b = -inputBlack * a
        const range = inputWhite - inputBlack;

        // Garantir range mínimo para evitar divisão por zero ou valores extremos
        if (range > 0) {
          const a = 255 / range;
          const b = -inputBlack * a;

          processed = processed.linear(a, b);
          console.log('[Adjust] Levels - Input range aplicado:', { inputBlack, inputWhite, range, a, b });
        } else {
          console.warn('[Adjust] Levels - Range inválido ignorado:', { inputBlack, inputWhite, range });
        }
      }

      // Aplicar gamma para ajustar midtones
      // IMPORTANTE: Sharp só aceita gamma >= 1.0 (não pode ser menor!)
      if (inputGray !== 1.0 && inputGray >= 1.0) {
        processed = processed.gamma(inputGray);
        console.log('[Adjust] Levels - Input gamma aplicado:', inputGray);
      } else if (inputGray < 1.0) {
        console.warn('[Adjust] Levels - Gamma < 1.0 ignorado (Sharp não aceita):', inputGray);
      }

      // PHASE 2: Output Levels (remapear range de saída)
      if (outputBlack !== 0 || outputWhite !== 255) {
        // Formula: linear(a, b) onde:
        // a = (outputWhite - outputBlack) / 255
        // b = outputBlack
        const a = (outputWhite - outputBlack) / 255;
        const b = outputBlack;
        processed = processed.linear(a, b);
        console.log('[Adjust] Levels - Output range remapeado:', { outputBlack, outputWhite, a, b });
      }

      console.log('[Adjust] Levels aplicado:', {
        input: { black: inputBlack, gray: inputGray, white: inputWhite },
        output: { black: outputBlack, white: outputWhite }
      });
    }

    // 5. BRIGHTNESS + CONTRAST (COMBINADOS)
    // IMPORTANTE: Multiple linear() calls overwrite each other!
    // Must combine brightness and contrast into a single linear(a, b) call
    // Formula: a = contrastFactor, b = -(128 * contrastFactor) + 128 + brightnessOffset
    if (brightness !== 0 || contrast !== 0) {
      const safeBrightness = Math.max(-150, Math.min(150, brightness));
      const safeContrast = Math.max(-100, Math.min(100, contrast));

      // Contrast factor (1.0 = no change)
      const contrastFactor = 1 + (safeContrast / 100);

      // Combined formula:
      // - Contrast: linear(factor, -(128 * factor) + 128)
      // - Brightness: Add offset to the 'b' parameter
      const a = contrastFactor;
      const b = -(128 * contrastFactor) + 128 + safeBrightness;

      processed = processed.linear(a, b);
      console.log('[Adjust] Brightness+Contrast combinados:', {
        a,
        b,
        brightness: safeBrightness,
        contrast: safeContrast,
        contrastFactor
      });
    }

    // 6. FIND EDGES (Detecção de bordas - estilo Photoshop)
    // Detecta e destaca contornos principais (útil para criar stencils de fotos)
    if (findEdges) {
      // Sobel kernel para detecção de bordas
      // Horizontal: detecta mudanças verticais
      // Vertical: detecta mudanças horizontais
      const strength = Math.max(0, Math.min(100, edgeStrength)) / 100;

      // Kernel Sobel 3x3 (detecta bordas em todas direções)
      const sobelKernel = {
        width: 3,
        height: 3,
        kernel: [
          -1 * strength, -1 * strength, -1 * strength,
          -1 * strength, 8 * strength, -1 * strength,
          -1 * strength, -1 * strength, -1 * strength
        ]
      };

      processed = processed
        .greyscale() // Converter para grayscale primeiro
        .convolve(sobelKernel) // Aplicar edge detection
        .normalize(); // Normalizar para 0-255

      console.log('[Adjust] Find Edges aplicado:', { strength: edgeStrength });
    }

    // 7. CLARITY (Contraste local nos meios-tons - estilo Lightroom)
    // Aumenta "punch" sem afetar pretos/brancos puros
    if (clarity !== 0) {
      const safeClarity = Math.max(-100, Math.min(100, clarity));

      // Clarity = unsharp mask com raio maior (afeta apenas meios-tons)
      // Valores positivos: aumentam contraste local
      // Valores negativos: suavizam contraste local
      const radius = 2.5; // Raio maior para afetar meios-tons
      const amount = Math.abs(safeClarity) / 50; // Converter para 0-2

      if (safeClarity > 0) {
        // Clarity positivo: sharpen nos meios-tons
        processed = processed.sharpen({
          sigma: radius,
          m1: 0.5, // Não afeta pretos
          m2: 3, // Não afeta brancos
          x1: 2,
          y2: 10,
          y3: 20
        });
      } else {
        // Clarity negativo: blur suave nos meios-tons
        processed = processed.blur(radius * 0.3);
      }

      console.log('[Adjust] Clarity aplicado:', { clarity: safeClarity, amount });
    }

    // 8. GAMMA (Correção de curva tonal - DEPRECATED em favor de LEVELS)
    // IMPORTANTE: Sharp.js só aceita gamma >= 1.0 (não pode ser menor!)
    // NOTA: Use LEVELS ao invés de GAMMA para controle completo
    if (gamma !== 1.0 && gamma >= 1.0 && !levels) {
      // Validar range 1.0 a 3.0
      const gammaValue = Math.max(1.0, Math.min(3.0, gamma));
      processed = processed.gamma(gammaValue);
      console.log('[Adjust] Gamma aplicado:', gammaValue);
    } else if (gamma < 1.0) {
      console.log('[Adjust] Gamma ignorado (Sharp não aceita < 1.0):', gamma);
    } else if (levels) {
      console.log('[Adjust] Gamma ignorado (LEVELS ativo tem prioridade)');
    }

    // 9. THRESHOLD (Corte preto/branco)
    // IMPORTANTE: Aplicar APENAS quando o usuário explicitamente mudou o threshold
    // NÃO aplicar automaticamente só porque tem ajustes de intensidade
    const thresholdChanged = threshold !== 128;

    if (thresholdChanged) {
      const thresholdValue = Math.max(0, Math.min(255, threshold));
      processed = processed.threshold(thresholdValue);
      console.log('[Adjust] Threshold aplicado:', thresholdValue);
    } else {
      console.log('[Adjust] Threshold não aplicado (valor padrão: 128)');
    }

    // 10. INVERT (Inverter cores)
    if (invert) {
      processed = processed.negate();
      console.log('[Adjust] Inversão aplicada');
    }

    // 11. ROTATION (Rotação)
    if (rotation !== 0) {
      const angle = Math.max(-180, Math.min(180, rotation));
      processed = processed.rotate(angle, {
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });
      console.log('[Adjust] Rotação aplicada:', angle + '°');
    }

    // 12. FLIP HORIZONTAL
    if (flipHorizontal) {
      processed = processed.flop();
      console.log('[Adjust] Flip horizontal aplicado');
    }

    // 13. FLIP VERTICAL
    if (flipVertical) {
      processed = processed.flip();
      console.log('[Adjust] Flip vertical aplicado');
    }

    // ===========================================================================
    // GERAR IMAGEM FINAL (PNG com qualidade máxima)
    // ===========================================================================

    const result = await processed
      .png({
        quality: 100,           // Qualidade máxima
        compressionLevel: 6,    // Compressão média (0=nenhuma, 9=máxima)
        palette: false          // Manter RGB completo
      })
      .toBuffer();

    // Converter para base64
    const base64Result = `data:image/png;base64,${result.toString('base64')}`;

    console.log('[Adjust] Processamento concluído:', {
      tamanhoOriginal: Math.round(imageBuffer.length / 1024) + 'KB',
      tamanhoFinal: Math.round(result.length / 1024) + 'KB',
      ajustes: Object.keys(controls).filter(k => {
        const value = controls[k as keyof AdjustControls];
        return value !== undefined && value !== 0 && value !== false && value !== 1.0;
      })
    });

    return NextResponse.json({
      success: true,
      image: base64Result,
      metadata: {
        size: result.length,
        adjustments: controls
      }
    });

  } catch (error: any) {
    console.error('[Adjust] Erro ao processar ajustes:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar ajustes',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Configuração de timeout (ajustes são rápidos: 2-5s)
export const maxDuration = 60;
