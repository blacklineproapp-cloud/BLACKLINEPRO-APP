import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { retryGeminiAPI } from './retry';
import { TOPOGRAPHIC_INSTRUCTION_OPTIMIZED, PERFECT_LINES_INSTRUCTION_OPTIMIZED, SIMPLIFY_TOPOGRAPHIC_TO_LINES, ANIME_ILLUSTRATION_INSTRUCTION_OPTIMIZED } from './prompts-optimized';

/**
 * Pré-processa a imagem para forçar o modelo a gerar linhas, não copiar a foto
 *
 * Para imagens escuras/baixa qualidade:
 * 1. Detecta se é escura (média de pixels baixa)
 * 2. Aplica correção gamma para clarear
 * 3. Aumenta contraste agressivamente
 * 4. Aplica sharpening forte para realçar bordas
 *
 * Isso "força" o Gemini a ver bordas claras que ele pode converter em contornos
 */
async function prepareImageForStencil(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');

  // Obter estatísticas da imagem para detectar se é escura
  const stats = await sharp(buffer).stats();
  const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;

  console.log(`[Gemini] Brilho médio da imagem: ${avgBrightness.toFixed(1)} (0-255)`);

  let processed = sharp(buffer);

  // Se a imagem é escura (média < 100), aplicar correção gamma agressiva
  if (avgBrightness < 100) {
    console.log('[Gemini] Imagem escura detectada, aplicando correção gamma');
    processed = processed.gamma(2.2); // Gamma > 1 clareia a imagem
  }

  // Se a imagem é muito escura (média < 60), clarear ainda mais
  if (avgBrightness < 60) {
    console.log('[Gemini] Imagem muito escura, aplicando brilho adicional');
    processed = processed.modulate({ brightness: 1.5 }); // +50% brilho
  }

  // Aplicar processamento para realçar bordas (em todas as imagens)
  const finalBuffer = await processed
    .normalize()                                    // Esticar histograma (máximo contraste)
    .sharpen({ sigma: 2.0, m1: 1.5, m2: 0.7 })     // Sharpening agressivo para bordas
    .jpeg({ quality: 90 })
    .toBuffer();

  return finalBuffer.toString('base64');
}

/**
 * Remove qualquer cor da imagem (converte para greyscale puro)
 * NÃO aplica threshold - preserva os tons de cinza que representam
 * densidade de linhas e hatching no stencil
 */
async function enforceMonochrome(base64DataUri: string): Promise<string> {
  const cleanBase64 = base64DataUri.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const monoBuffer = await sharp(buffer)
    .greyscale()                    // Remove toda informação de cor (sem threshold!)
    .png({ compressionLevel: 6 })  // Saída PNG limpa
    .toBuffer();

  return `data:image/png;base64,${monoBuffer.toString('base64')}`;
}

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Modelo para TOPOGRÁFICO V7.0 - MAPEAMENTO TOPOGRÁFICO INTERPRETATIVO
// Temperature 0.4 = permite criar contornos e hatching criativamente
// topP 0.4 = seleção ampla para variar padrões de linhas
// topK 20 = mais opções para criar padrões de hatching diferenciados
// NOTA: temp=0 fazia o modelo apenas COPIAR a foto.
// O topográfico precisa INTERPRETAR a foto e criar linhas NOVAS.
const topographicModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.4,  // Criatividade para interpretar e criar contornos
    topP: 0.4,         // Amplo o suficiente para variar hatching/textura
    topK: 20,          // Mais opções para padrões de linha diferenciados
  },
});


// Modelo para LINHAS - USANDO MESMOS PARÂMETROS DO TOPOGRÁFICO
// Paradoxalmente, parâmetros menos restritivos funcionam melhor
// O Topográfico funcionou sem adicionar elementos, então usamos o mesmo
const linesModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // ZERO criatividade - fidelidade 100%
    topP: 0.15,        // Mesmo do Topográfico (funcionou)
    topK: 10,          // Mesmo do Topográfico (funcionou)
  },
});


// Modelo para ANIME/ILUSTRAÇÃO - Ultra conservador
// Para animes, desenhos, Maori, Tribal e qualquer arte com linhas de contorno fortes
// Objetivo: LIMPAR e PRESERVAR linhas existentes, não criar novas
const animeModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // ZERO criatividade - apenas limpar
    topP: 0.1,         // Ultra conservador - não adiciona nada
    topK: 5,           // Poucos tokens - mantém simplicidade
  },
});


// Modelo para geração de imagens a partir de texto - Gemini 2.5 Flash
const textToImageModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
  },
});

// Modelo DEDICADO para Aprimoramento - Gemini 2.5 Flash
// Configuração otimizada para reconstrução de alta qualidade
const dedicatedEnhanceModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.1, // Mínima criatividade para permitir reconstrução inteligente de detalhes
    topP: 0.2,        // Conservador mas permite reconstrução de texturas
    topK: 5,          // Poucas opções para manter fidelidade
  },
});

// Modelo para operações apenas texto (análise de cores)
const textModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
  }
});

// Gerar estêncil a partir de imagem usando mapeamento topográfico
export async function generateStencilFromImage(
  base64Image: string,
  promptDetails: string = '',
  style: 'standard' | 'perfect_lines' | 'anime' = 'standard'
): Promise<string> {
  // Seleção de prompt baseado no estilo
  // standard = LINHAS (para fotos)
  // perfect_lines = TOPOGRÁFICO (7 níveis)
  // anime = ANIME/ILUSTRAÇÃO (para desenhos, animes, Maori, Tribal)
  let systemInstruction: string;
  let model: any;
  let modeInfo: string;
  let traceInstruction: string;

  switch (style) {
    case 'anime':
      systemInstruction = ANIME_ILLUSTRATION_INSTRUCTION_OPTIMIZED;
      model = animeModel;
      modeInfo = 'ANIME/ILUSTRAÇÃO (temp: 0, topP: 0.1, topK: 5) - LIMPAR E PRESERVAR LINHAS';
      traceInstruction = 'EXTRACT clean lineart from this image. If it is an illustration, PRESERVE existing contour lines and REMOVE fills. If it is a photo, CONVERT it to anime-style lineart (bold outlines, no shading). Output: black lines on white background only. NO solid fills. PNG format.';
      break;
    case 'perfect_lines':
      systemInstruction = TOPOGRAPHIC_INSTRUCTION_OPTIMIZED;
      model = topographicModel;
      modeInfo = 'TOPOGRÁFICO V7.0 (temp: 0.4, topP: 0.4, topK: 20) - INTERPRETAÇÃO TOPOGRÁFICA';
      traceInstruction = `⛔ CRITICAL: DO NOT OUTPUT A PHOTO. OUTPUT ONLY LINES. ⛔

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
      model = linesModel;
      modeInfo = 'LINHAS DETALHADAS (temp: 0, topP: 0.15, topK: 10) - TODOS DETALHES, LINHAS LIMPAS';
      traceInstruction = 'TRACE this exact image into a line stencil. Do NOT redraw. Apply a geometric line transformation to the EXACT pixels. Every contour MUST overlay perfectly with the original.';
      break;
  }
  
  const fullPrompt = `${systemInstruction}\n\n${promptDetails ? `DETALHES ADICIONAIS: ${promptDetails}\n\n` : ''}${traceInstruction}`;


  // Verificar se é URL e baixar a imagem
  let cleanBase64: string;
  
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    // É uma URL - baixar e converter para base64
    console.log('[Gemini] Detectada URL, baixando imagem:', base64Image.substring(0, 100));
    try {
      const response = await fetch(base64Image);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString('base64');
      console.log('[Gemini] Imagem baixada e convertida para base64, tamanho:', cleanBase64.length);
    } catch (error: any) {
      console.error('[Gemini] Erro ao baixar imagem:', error);
      throw new Error(`Falha ao baixar imagem: ${error.message}`);
    }
  } else {
    // Já é base64, apenas limpar o prefixo data URI se existir
    cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  // Pré-processar imagem: sharpening + contraste para melhorar detecção de bordas
  // Isso ajuda especialmente com imagens de baixa qualidade (JPEG comprimido, borradas)
  try {
    cleanBase64 = await prepareImageForStencil(cleanBase64);
    console.log('[Gemini] Imagem pré-processada (sharpen + normalize)');
  } catch (prepError) {
    console.warn('[Gemini] Pré-processamento falhou, usando imagem original:', prepError);
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
      const parts = response.candidates?.[0]?.content?.parts;

      if (parts) {
        for (const part of parts) {
          // @ts-ignore - Check for inline image data
          if (part.inlineData) {
            // @ts-ignore
            const rawImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            // 🎯 FORÇAR MONOCROMÁTICO: Remove qualquer cor que o Gemini tenha gerado
            console.log('[Gemini] Aplicando enforceMonochrome para garantir saída B&W');
            return await enforceMonochrome(rawImage);
          }
        }
      }

      // Se não retornou imagem, logar resposta para debug
      console.error('Resposta do Gemini:', JSON.stringify(response, null, 2));
      throw new Error('Modelo não retornou imagem no formato esperado');
    } catch (error: any) {
      console.error('Erro ao gerar estêncil com Gemini:', error);
      throw new Error(`Falha ao gerar estêncil: ${error.message || 'Erro desconhecido'}`);
    }
  }, `Gemini Stencil Generation (${style})`);
}

// Gerar ideia de tatuagem a partir de texto (e opcionalmente imagem de referência)
export async function generateTattooIdea(
  prompt: string,
  size: 'A4' | 'A3' | '1K' | '2K' | '4K' = 'A4',
  referenceImage?: string // base64 da imagem
): Promise<string> {
  const resolutionMap = {
    'A4': '2480x3508px (A4 - 21x29.7cm @ 300 DPI)',
    'A3': '3508x4961px (A3 - 29.7x42cm @ 300 DPI)',
    '1K': '1024x1024px',
    '2K': '2048x2048px',
    '4K': '4096x4096px'
  };

  // Construir prompt baseado em ter ou não imagem de referência
  const hasReferenceImage = !!referenceImage;

  const basePrompt = hasReferenceImage
    ? `ATUE COMO: Artista especialista em design de tatuagem hiper-realista.

MISSÃO: Criar uma arte de tatuagem FOTORREALISTA inspirada na IMAGEM DE REFERÊNCIA fornecida e nas seguintes instruções:

"${prompt}"

IMPORTANTE: Use a IMAGEM como base de inspiração, mas crie uma versão artística melhorada para tatuagem, seguindo as instruções do cliente.`
    : `ATUE COMO: Artista especialista em design de tatuagem hiper-realista.

MISSÃO: Criar uma arte de tatuagem FOTORREALISTA baseada nesta descrição do cliente:

"${prompt}"`;

  const tattooPrompt = `${basePrompt}

ESPECIFICAÇÕES TÉCNICAS:
- Resolução: ${resolutionMap[size]} (alta definição)
- Qualidade: Ultra HD, máxima nitidez
- Estilo: Realismo fotográfico profissional
- Renderização: 8K quality, detalhes ultra-precisos

DIRETRIZES ARTÍSTICAS:

1. REALISMO FOTOGRÁFICO:
   - Renderize como uma fotografia real em alta resolução
   - Texturas hiper-realistas (pele, pelos, tecidos, superfícies)
   - Iluminação cinematográfica natural
   - Profundidade de campo realista
   - Sombras e reflexos naturais

2. ANATOMIA E PROPORÇÕES:
   - Se houver figuras humanas/animais: anatomia perfeita
   - Proporções realistas e corretas
   - Poses naturais e fluidas
   - Expressões faciais realistas (se aplicável)

3. DETALHAMENTO MÁXIMO:
   - Microdetalhes visíveis (poros, texturas, fibras)
   - Gradientes suaves e naturais
   - Cada elemento renderizado com precisão fotográfica
   - Máxima definição em todas as áreas

4. COMPOSIÇÃO PROFISSIONAL:
   - Enquadramento equilibrado
   - Foco principal bem definido
   - Background que complementa o design
   - Composição que funciona bem em pele

5. CORES E TONALIDADES:
   - Paleta rica e vibrante (se colorido) OU
   - Tons de cinza profundos e ricos (se preto e cinza)
   - Contraste bem balanceado
   - Saturação profissional

IMPORTANTE:
- NÃO é um esboço ou desenho
- NÃO é um estêncil ou linha
- É uma ARTE FINALIZADA fotorrealista pronta para ser usada como referência de tatuagem
- Deve parecer uma FOTOGRAFIA REAL, não um desenho

🚫 PROIBIDO ABSOLUTAMENTE:
- NÃO gere a imagem EM um braço tatuado
- NÃO gere a imagem EM pele humana
- NÃO mostre a arte aplicada em corpo/braço/perna
- Gere APENAS a arte em FUNDO NEUTRO (branco, cinza ou preto)
- A arte deve estar ISOLADA, como uma ilustração em papel/tela
- O resultado é a ARTE PURA, não a arte tatuada em alguém

🚫 NUNCA INCLUA:
- Molduras, frames ou bordas decorativas ao redor da arte
- Formato de retrato/quadro pendurado na parede
- Efeitos de "foto emoldurada" ou "canvas esticado"
- Sombras de moldura ou efeitos 3D de quadro
- Texturas de papel/canvas nas bordas
- A arte deve ser LIVRE e SOLTA no espaço, sem limitações visuais de enquadramento

✅ FORMATO CORRETO:
- Arte flutuando livremente no fundo neutro
- Sem molduras, sem bordas, sem frames
- Imagem limpa e direta, pronta para aplicação
- Foco 100% na arte, zero elementos decorativos externos

GERE A IMAGEM AGORA:`;

  // Usar retry logic para lidar com falhas temporárias do Gemini
  return retryGeminiAPI(async () => {
    try {
      // Preparar conteúdo baseado em ter ou não imagem
      let content: any;

      if (hasReferenceImage && referenceImage) {
        // Extrair base64 puro (remover data:image/...;base64,)
        const base64Data = referenceImage.includes('base64,')
          ? referenceImage.split('base64,')[1]
          : referenceImage;

        // Detectar mimeType da imagem
        const mimeType = referenceImage.match(/data:(image\/[a-z]+);/)?.[1] || 'image/jpeg';

        // Multimodal: imagem + texto
        content = [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          tattooPrompt,
        ];
      } else {
        // Apenas texto
        content = tattooPrompt;
      }

      const result = await textToImageModel.generateContent(content);
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

      // Se chegou aqui, o modelo retornou texto ao invés de imagem
      const text = response.text();
      console.error('Gemini retornou texto ao invés de imagem:', text);
      throw new Error('Falha ao gerar imagem. O modelo retornou apenas texto.');
    } catch (error: any) {
      console.error('Erro ao gerar ideia com Gemini:', error);
      throw new Error(`Falha ao gerar design: ${error.message || 'Erro desconhecido'}`);
    }
  }, `Gemini IA Gen (${size})`);
}

// Aprimorar imagem (upscale 4K)
export async function enhanceImage(base64Image: string): Promise<string> {
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
    console.log('[enhanceImage] Detectada URL, baixando imagem:', base64Image.substring(0, 100));
    try {
      const response = await fetch(base64Image);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString('base64');
      console.log('[enhanceImage] Imagem baixada e convertida para base64, tamanho:', cleanBase64.length);
    } catch (error: any) {
      console.error('[enhanceImage] Erro ao baixar imagem:', error);
      throw new Error(`Falha ao baixar imagem: ${error.message}`);
    }
  } else {
    // Já é base64, apenas limpar o prefixo data URI se existir
    cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  // 🚀 CORREÇÃO #3: Adicionar retry para falhas temporárias do Gemini
  try {
    return await retryGeminiAPI(async () => {
      const result = await dedicatedEnhanceModel.generateContent([
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
    console.error('Erro ao aprimorar imagem:', error);
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
    
    console.log('[Remove BG] Iniciando remoção de fundo...');

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
            console.log('[Remove BG] Fundo removido com sucesso');
            return `data:${mimeType};base64,${imageData}`;
          }
        }
      }
    }

    throw new Error('Modelo não retornou imagem no formato esperado');
  } catch (error: any) {
    console.error('Erro ao remover fundo:', error);
    throw new Error(`Falha ao remover fundo: ${error.message || 'Erro desconhecido'}`);
  }
}

// Analisar cores da imagem
export async function analyzeImageColors(
  base64Image: string,
  brand: string = 'Electric Ink'
): Promise<{
  summary: string;
  colors: Array<{
    hex: string;
    name: string;
    usage: string;
  }>;
}> {
  const prompt = `ATUE COMO: Especialista em análise de cores e colorimetria para tatuagem profissional.

MISSÃO: Analisar PROFUNDAMENTE TODAS as cores, tons e nuances desta imagem e criar uma paleta COMPLETA de referência profissional.

ANÁLISE TÉCNICA REQUERIDA:

1. EXTRAÇÃO COMPLETA DE CORES (SEM LIMITE):
   - Identifique TODAS as cores presentes na imagem (principais, secundárias, tons, nuances)
   - Capture TODAS as variações de um mesmo tom (claro, médio, escuro)
   - Inclua os degradês e transições entre cores
   - Calcule os valores HEX exatos de cada cor
   - Ordene por predominância (mais presente primeiro)
   - NÃO SE LIMITE a um número específico - extraia o que for necessário

2. CARACTERIZAÇÃO DE CADA COR:
   - Código hexadecimal PRECISO (#RRGGBB)
   - Nome técnico da cor (baseado em teoria das cores)
   - Temperatura da cor (quente/fria/neutra)
   - Uso recomendado na tatuagem

3. MAPEAMENTO PARA TINTAS ${brand}:
   - Use seu conhecimento sobre as cores disponíveis da marca ${brand}
   - Se a marca for conhecida (Electric Ink, Eternal Ink, Intenze, etc): use nomes de cores REAIS dessas marcas
   - Para "Genérico": use nomes descritivos profissionais
   - Priorize cores POPULARES e COMUNS no catálogo da marca
   - Exemplos de nomes reais:
     * Electric Ink: "Liners Black", "True Black", "Medium Grey", etc
     * Eternal Ink: "Triple Black", "Motor City", "Marigold", etc
     * Intenze: "True Black", "Zuper Black", "Boris Grey", etc
   - Se não tiver certeza de um nome específico, use descrição + marca: "${brand} Preto Intenso"

4. APLICAÇÃO TÉCNICA:
   Para cada cor, especifique:
   - Uso principal: sombra/luz/preenchimento/contorno/destaque
   - Camadas sugeridas: base/intermediária/finalização
   - Diluição recomendada: pura/média/leve

5. PALETA GERAL:
   - Resumo técnico da harmonia cromática
   - Tipo de paleta: monocromática/análoga/complementar/triádica
   - Contraste geral: alto/médio/baixo
   - Vibração: alta saturação/tons naturais/dessaturados

FORMATO DE SAÍDA - JSON VÁLIDO:
{
  "summary": "Descrição técnica da paleta cromática identificada (2-3 frases)",
  "colors": [
    {
      "hex": "#000000",
      "name": "Nome descritivo da cor + sugestão de tinta ${brand}",
      "usage": "Uso técnico detalhado (camada, área, diluição)"
    }
  ]
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou explicações extras
- Seja PRECISO nos códigos hexadecimais
- Use nomes DESCRITIVOS, não invente códigos de produto
- Foque em CORES REAIS da imagem, não em interpretações artísticas

ANALISE A IMAGEM AGORA:`;

  // Detectar o mimeType original da imagem
  let mimeType = 'image/jpeg'; // fallback padrão
  const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const result = await textModel.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Tentar extrair JSON (aceita markdown code blocks ou JSON puro)
    let jsonText = text;

    // Remover markdown code blocks se existirem
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    // Extrair JSON puro
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Resposta do Gemini não contém JSON:', text);
      throw new Error('Resposta não contém JSON válido');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Validar estrutura básica
    if (!parsedData.summary || !Array.isArray(parsedData.colors)) {
      throw new Error('JSON inválido: faltam campos obrigatórios (summary, colors)');
    }

    return parsedData;
  } catch (error: any) {
    console.error('Erro ao analisar cores:', error);
    throw new Error(`Falha ao analisar cores: ${error.message || 'Erro desconhecido'}`);
  }
}

// Pipeline 2-etapas: Topográfico → Linhas (Modo Experimental)
export async function generateLinesFromTopographic(
  base64Image: string,
  promptDetails: string = ''
): Promise<{ topographic: string; lines: string; totalTime: number }> {
  const startTime = Date.now();

  console.log('[Pipeline 2-Etapas] Iniciando: Topográfico → Linhas');

  try {
    // ETAPA 1: Gerar topográfico detalhado (7 níveis)
    console.log('[Pipeline 2-Etapas] ETAPA 1: Gerando topográfico...');
    const topographicStencil = await generateStencilFromImage(
      base64Image,
      promptDetails,
      'perfect_lines' // Topográfico V3.0
    );
    console.log('[Pipeline 2-Etapas] ✅ Topográfico gerado');

    // ETAPA 2: Simplificar topográfico para linhas
    console.log('[Pipeline 2-Etapas] ETAPA 2: Simplificando para linhas...');

    // Construir prompt de simplificação
    const simplifyPrompt = `${SIMPLIFY_TOPOGRAPHIC_TO_LINES}\n\n${promptDetails ? `DETALHES ADICIONAIS: ${promptDetails}\n\n` : ''}Simplifique este estêncil topográfico detalhado para um estêncil de linhas simples.`;

    // Limpar base64 do topográfico
    const cleanTopoBase64 = topographicStencil.replace(/^data:image\/[a-z]+;base64,/, '');

    // Usar modelo de linhas (mais simples) para simplificação
    const result = await retryGeminiAPI(async () => {
      return await linesModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: simplifyPrompt },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cleanTopoBase64,
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
            const linesStencil = `data:${mimeType};base64,${imageData}`;

            const totalTime = Date.now() - startTime;
            console.log(`[Pipeline 2-Etapas] ✅ Concluído em ${(totalTime / 1000).toFixed(1)}s`);

            return {
              topographic: topographicStencil,
              lines: linesStencil,
              totalTime
            };
          }
        }
      }
    }

    throw new Error('Modelo não retornou imagem simplificada');
  } catch (error: any) {
    console.error('[Pipeline 2-Etapas] Erro:', error);
    throw error;
  }
}
