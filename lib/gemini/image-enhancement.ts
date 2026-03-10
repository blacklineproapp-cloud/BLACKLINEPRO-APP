import { retryGeminiAPI } from '../retry';
import { logger } from '../logger';
import { getModelsForKey, dedicatedEnhanceModel } from './models-config';

// Aprimorar imagem (upscale 4K)
export async function enhanceImage(base64Image: string, userApiKey?: string): Promise<string> {
  const prompt = `🎯 MISSION: PROFESSIONAL 4K IMAGE ENHANCEMENT & SUPER-RESOLUTION

You are a PROFESSIONAL IMAGE ENHANCEMENT ENGINE. Your task is to transform this image into a HIGH-QUALITY 4K version while maintaining ABSOLUTE FIDELITY to the original content.

═══════════════════════════════════════════════════════════════
📐 TECHNICAL SPECIFICATIONS - OUTPUT REQUIREMENTS:
═══════════════════════════════════════════════════════════════

1. RESOLUTION ENHANCEMENT:
   - Upscale to maximum possible resolution (target: 4K / 4096px on longest side)
   - Use intelligent super-resolution to add REAL detail, not blur
   - Every edge should be crisp and well-defined
   - Fine details (text, patterns, textures) must be sharp and readable

2. QUALITY RECONSTRUCTION:
   - REMOVE all JPEG compression artifacts (blocks, banding, mosquito noise)
   - REMOVE digital noise and grain while preserving intentional film grain if artistic
   - RECONSTRUCT lost details in shadows and highlights
   - ENHANCE micro-contrast for depth and dimension
   - SHARPEN edges without creating halos or artifacts

3. TEXTURE ENHANCEMENT:
   - Skin: Reconstruct pores, fine lines, and natural texture (NOT plastic/smooth)
   - Fabric: Enhance weave patterns, thread details, folds
   - Hair: Individual strands should be visible and defined
   - Metal/Glass: Reflections and highlights should be crisp
   - Nature: Leaves, bark, grass should have natural detail

═══════════════════════════════════════════════════════════════
🔒 ABSOLUTE PRESERVATION RULES - DO NOT VIOLATE:
═══════════════════════════════════════════════════════════════

❌ DO NOT change the subject, pose, or composition
❌ DO NOT alter facial features, expressions, or identity
❌ DO NOT add or remove objects from the scene
❌ DO NOT change colors, lighting direction, or mood
❌ DO NOT apply artistic filters or style transfer
❌ DO NOT crop or reframe the image
❌ DO NOT change backgrounds or environments

✅ DO enhance what already exists
✅ DO make blurry areas sharp
✅ DO remove compression artifacts
✅ DO increase resolution intelligently
✅ DO preserve the EXACT same image, just in higher quality

═══════════════════════════════════════════════════════════════
🎬 QUALITY BENCHMARK:
═══════════════════════════════════════════════════════════════

The output should look like:
- The original image was captured with a professional camera
- Then printed in a high-end magazine
- With perfect focus and clarity throughout
- No visible digital artifacts or noise
- Ready for large-format printing

EXECUTE NOW: Generate the enhanced 4K version of this image.`;

  // Detectar o mimeType original da imagem
  let mimeType = 'image/jpeg'; // fallback padrão
  const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  // Verificar se é URL e baixar a imagem (mesmo fix do generateStencilFromImage)
  let cleanBase64: string;

  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    // É uma URL - baixar e converter para base64
    logger.info('[Gemini] Detectada URL, baixando imagem:', base64Image.substring(0, 100));
    try {
      const response = await fetch(base64Image);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString('base64');
      logger.info('[Gemini] Imagem baixada e convertida para base64, tamanho:', cleanBase64.length);
    } catch (error: any) {
      logger.error('[Gemini] Erro ao baixar imagem:', error);
      throw new Error(`Falha ao baixar imagem: ${error.message}`);
    }
  } else {
    // Já é base64, apenas limpar o prefixo data URI se existir
    cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  // 🚀 CORREÇÃO #3: Adicionar retry para falhas temporárias do Gemini
  try {
    return await retryGeminiAPI(async () => {
      const result = await getModelsForKey(userApiKey).dedicatedEnhanceModel.generateContent([
        prompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        },
      ]);

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;

      if (parts) {
        for (const part of parts) {
          // @ts-ignore
          if (part.inlineData) {
            // @ts-ignore
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      throw new Error('Modelo não retornou imagem no formato esperado');
    }, 'Gemini Enhance');
  } catch (error: any) {
    logger.error('[Gemini] Erro ao aprimorar imagem:', error);
    throw new Error(`Falha ao aprimorar imagem: ${error.message || 'Erro desconhecido'}`);
  }
}

// Remover fundo da imagem
export async function removeBackground(base64Image: string): Promise<string> {
  const removeBackgroundInstruction = `
You are an AI specialized in removing backgrounds from images.

TASK: Remove the background from this image and return ONLY the main subject(s) on a transparent/white background.

REQUIREMENTS:
- Keep the main subject(s) intact with clean edges
- Remove ALL background elements
- Output should have a clean, white background (since PNG transparency isn't always supported)
- Preserve all details of the main subject
- Clean, precise edges around the subject
- Do NOT modify the subject itself - only remove the background

OUTPUT: A clean image with the subject on white background, ready for stencil conversion or further processing.
`;

  try {
    // Limpar base64
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    logger.info('[Gemini] Iniciando remoção de fundo...');

    // Usar o modelo dedicado para processamento de imagem
    const result = await retryGeminiAPI(async () => {
      return await dedicatedEnhanceModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: removeBackgroundInstruction },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      });
    });

    // Processar resposta
    const response = result.response;
    const candidates = response.candidates;

    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            logger.info('[Gemini] Fundo removido com sucesso');
            return `data:${mimeType};base64,${imageData}`;
          }
        }
      }
    }

    throw new Error('Modelo não retornou imagem no formato esperado');
  } catch (error: any) {
    logger.error('[Gemini] Erro ao remover fundo:', error);
    throw new Error(`Falha ao remover fundo: ${error.message || 'Erro desconhecido'}`);
  }
}
