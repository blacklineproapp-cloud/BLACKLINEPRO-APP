import sharp from 'sharp';
import { retryGeminiAPI } from '../retry';
import { TOPOGRAPHIC_INSTRUCTION_OPTIMIZED, PERFECT_LINES_INSTRUCTION_OPTIMIZED, ANIME_ILLUSTRATION_INSTRUCTION_OPTIMIZED } from '../prompts-optimized';
import { logger, getErrorMessage } from '../logger';
import { prepareImageForStencil, enforceMonochrome, ensureDimensionsMatch } from './image-preprocessing';
import { getModelsForKey } from './models-config';

// Gerar estêncil a partir de imagem usando mapeamento topográfico
export async function generateStencilFromImage(
  base64Image: string,
  promptDetails: string = '',
  style: 'standard' | 'perfect_lines' | 'anime' = 'standard',
  userApiKey?: string
): Promise<string> {
  const result = await generateStencilWithCost(base64Image, promptDetails, style, userApiKey);
  return result.image;
}

/**
 * Versão com tracking de custo - retorna imagem + usageMetadata
 * Use esta função nas APIs para capturar custo real
 */
export async function generateStencilWithCost(
  base64Image: string,
  promptDetails: string = '',
  style: 'standard' | 'perfect_lines' | 'anime' = 'standard',
  userApiKey?: string
): Promise<{
  image: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}> {
  // Seleção de prompt baseado no estilo
  // standard = LINHAS (para fotos)
  // perfect_lines = TOPOGRÁFICO (7 níveis)
  // anime = ANIME/ILUSTRAÇÃO (para desenhos, animes, Maori, Tribal)
  const models = getModelsForKey(userApiKey);
  let systemInstruction: string;
  let model: any;
  let modeInfo: string;
  let traceInstruction: string;

  switch (style) {
    case 'anime':
      systemInstruction = ANIME_ILLUSTRATION_INSTRUCTION_OPTIMIZED;
      model = models.animeModel;
      modeInfo = 'ANIME/ILUSTRAÇÃO (temp: 0, topP: 0.1, topK: 5) - LIMPAR E PRESERVAR LINHAS';
      traceInstruction = `🎯 INTELLIGENT DETECTION - Apply focus ONLY when needed:

IF this is a SCREENSHOT (Instagram, Pinterest, social media):
→ Extract ONLY the artwork/design shown
→ IGNORE all UI elements (buttons, icons, text, usernames, etc.)

IF this is a WATERMARKED image or has PHONE UI:
→ Extract ONLY the main content
→ IGNORE watermarks, timestamps, phone interface

IF this is a TATTOO ON SKIN:
→ Extract ONLY the tattoo design
→ IGNORE the body part

IF this is a NORMAL PHOTO/ARTWORK (no UI, no watermarks):
→ Process EVERYTHING in the image
→ PRESERVE background details, scenery, all elements
→ Do NOT ignore anything - capture the complete scene

EXTRACT clean lineart:
- If it is an illustration: PRESERVE existing contour lines and REMOVE fills
- If it is a photo: CONVERT it to anime-style lineart (bold outlines, no shading)

Output: black lines on white background only. NO solid fills. PNG format.`;
      break;
    case 'perfect_lines':
      systemInstruction = TOPOGRAPHIC_INSTRUCTION_OPTIMIZED;
      model = models.topographicModel;
      modeInfo = 'TOPOGRÁFICO V7.0 (temp: 0.4, topP: 0.4, topK: 20) - INTERPRETAÇÃO TOPOGRÁFICA';
      traceInstruction = `🎯 INTELLIGENT DETECTION - Apply focus ONLY when needed:

IF this is a SCREENSHOT (Instagram, Pinterest, social media):
→ Extract ONLY the artwork/design shown
→ IGNORE all UI elements (buttons, icons, text, usernames, etc.)

IF this is a WATERMARKED image or has PHONE UI:
→ Extract ONLY the main content
→ IGNORE watermarks, timestamps, phone interface

IF this is a TATTOO ON SKIN:
→ Extract ONLY the tattoo design
→ IGNORE the body part

IF this is a NORMAL PHOTO/ARTWORK (no UI, no watermarks):
→ Process EVERYTHING in the image
→ PRESERVE background details, scenery, all elements
→ Map the COMPLETE scene with all depth levels

⛔ CRITICAL: DO NOT OUTPUT A PHOTO. OUTPUT ONLY LINES. ⛔

You MUST generate a TOPOGRAPHIC LINE MAP stencil. The output CANNOT look like the input photo.

🚨 IF THE INPUT IS DARK OR LOW QUALITY:
- DO NOT try to "fix" or "enhance" the photo
- DO NOT output a cleaner version of the same image
- STILL output ONLY contour lines and hatching patterns
- If you can barely see details, draw lines where you detect ANY edge

MANDATORY OUTPUT FORMAT:
- BLACK LINES on WHITE BACKGROUND only
- NO photographs, NO realistic rendering, NO gray areas, NO solid fills
- ONLY: contour lines, hatching patterns, and texture strokes

WHAT TO DRAW:
1. CONTOUR LINES at every depth/tone transition (like a terrain elevation map)
2. HATCHING inside shadow zones (parallel lines - denser = darker)
3. TEXTURE STROKES showing material (skin=curves, hair=flowing strokes, fabric=fold lines)
4. Lines must FOLLOW the 3D surface direction

TEST: If someone looks at your output, they should see LINES AND PATTERNS, not a photo.
If your output still looks like a photograph, YOU HAVE FAILED. Try again with ONLY lines.

OUTPUT: Black line stencil. Contours + hatching + textures. PNG format.`;
      break;
    case 'standard':
    default:
      systemInstruction = PERFECT_LINES_INSTRUCTION_OPTIMIZED;
      model = models.linesModel;
      modeInfo = 'LINHAS V2.0 (temp: 0, topP: 0.15, topK: 10) - TODOS DETALHES + CONTORNOS DE SOMBRAS';
      traceInstruction = `🎯 INTELLIGENT DETECTION - Apply focus ONLY when needed:

IF this is a SCREENSHOT (Instagram, Pinterest, social media):
→ Extract ONLY the artwork/design shown
→ IGNORE all UI elements (buttons, icons, text, usernames, etc.)

IF this is a WATERMARKED image or has PHONE UI:
→ Extract ONLY the main content
→ IGNORE watermarks, timestamps, phone interface

IF this is a TATTOO ON SKIN:
→ Extract ONLY the tattoo design
→ IGNORE the body part

IF this is a NORMAL PHOTO/ARTWORK (no UI, no watermarks):
→ Process EVERYTHING in the image
→ PRESERVE background details, scenery, all elements
→ Trace the COMPLETE scene with all details

TRACE into a complete line stencil:

1. STRUCTURAL EDGES: All physical edges with medium lines (0.4-0.8pt)
2. SHADOW BOUNDARIES: Trace WHERE shadows BEGIN and END with thinner lines (0.2-0.4pt)
3. TONAL TRANSITIONS: Each change in tone gets a boundary contour line

CRITICAL:
- Shadows are captured as BOUNDARY LINES, not filled with hatching
- Draw a thin line where each shadow begins. Multiple lines for gradual shadows
- Do NOT redraw or reimagine. Apply a geometric line transformation to the EXACT pixels
- Every structural contour AND every shadow boundary MUST be traced

OUTPUT: Black contour lines on white. Both structure AND shadow boundaries.`;
      break;
  }

  const fullPrompt = `${systemInstruction}\n\n${promptDetails ? `DETALHES ADICIONAIS: ${promptDetails}\n\n` : ''}${traceInstruction}`;


  // Verificar se é URL e baixar a imagem
  let cleanBase64: string;

  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    // É uma URL - baixar e converter para base64
    logger.info('[Gemini] Detectada URL, baixando imagem', { url: base64Image.substring(0, 100) });
    try {
      const response = await fetch(base64Image);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString('base64');
      logger.info('[Gemini] Imagem baixada e convertida para base64', { tamanho: cleanBase64.length });
    } catch (error: unknown) {
      logger.error('[Gemini] Erro ao baixar imagem:', error);
      throw new Error(`Falha ao baixar imagem: ${getErrorMessage(error)}`);
    }
  } else {
    // Já é base64, apenas limpar o prefixo data URI se existir
    cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  // Capturar dimensões originais antes do processamento
  let originalWidth: number;
  let originalHeight: number;
  try {
    const originalBuffer = Buffer.from(cleanBase64, 'base64');
    const originalMeta = await sharp(originalBuffer).metadata();
    originalWidth = originalMeta.width!;
    originalHeight = originalMeta.height!;
    logger.debug('[Gemini] Dimensões originais', { originalWidth, originalHeight });
  } catch (error) {
    logger.error('[Gemini] Erro ao capturar dimensões:', error);
    throw new Error('Falha ao processar dimensões da imagem');
  }

  // Pré-processar imagem: sharpening + contraste para melhorar detecção de bordas
  // Isso ajuda especialmente com imagens de baixa qualidade (JPEG comprimido, borradas)
  try {
    cleanBase64 = await prepareImageForStencil(cleanBase64);
    logger.info('[Gemini] Imagem pré-processada (sharpen + normalize)');
  } catch (prepError) {
    logger.warn('[Gemini] Pré-processamento falhou, usando imagem original', { error: String(prepError) });
    // Continuar com a imagem original se o pré-processamento falhar
  }

  // Usar retry logic para lidar com falhas temporárias do Gemini
  return retryGeminiAPI(async () => {
    try {
      // Adicionar timeout de 2 minutos para prevenir hanging
      const result = await Promise.race([
        model.generateContent([
          fullPrompt,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/jpeg',
            },
          },
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Gemini demorou mais de 2 minutos')), 120000)
        )
      ]);

      const response = result.response;
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;

      if (parts) {
        for (const part of parts) {
          // @ts-ignore - Check for inline image data
          if (part.inlineData) {
            // ... (success logic remains)
            const rawImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            logger.info('[Gemini] Aplicando enforceMonochrome para garantir saída B&W');
            const monochromeImage = await enforceMonochrome(rawImage);

            logger.info('[Gemini] Verificando dimensões da saída...');
            const finalImage = await ensureDimensionsMatch(
              monochromeImage,
              originalWidth,
              originalHeight
            );

            const usageMetadata = response.usageMetadata;
            logger.info('[Gemini] usageMetadata', { usageMetadata });

            return {
              image: finalImage,
              usageMetadata
            };
          }
        }
      }

      // Se não retornou imagem, logar resposta para debug
      logger.error('[Gemini] Resposta:', JSON.stringify(response, null, 2));

      const finishReason = candidate?.finishReason;
      if (finishReason === 'OTHER') {
        throw new Error('Modelo bloqueou a resposta (Reason: OTHER). Isso pode ser causado por filtros de segurança ou restrições do modelo.');
      }

      throw new Error(`Modelo não retornou imagem (Reason: ${finishReason || 'Desconhecida'})`);
    } catch (error: unknown) {
      logger.error('[Gemini] Erro ao gerar estêncil com Gemini:', error);
      throw new Error(`Falha ao gerar estêncil: ${getErrorMessage(error) || 'Erro desconhecido'}`);
    }
  }, `Gemini Stencil Generation (${style})`);
}
