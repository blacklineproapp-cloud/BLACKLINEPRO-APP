import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryGeminiAPI } from './retry';
import { TOPOGRAPHIC_INSTRUCTION_OPTIMIZED, PERFECT_LINES_INSTRUCTION_OPTIMIZED, SIMPLIFY_TOPOGRAPHIC_TO_LINES } from './prompts-optimized';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Modelo para TOPOGRÁFICO V3.0 - MÁXIMA RIQUEZA DE DETALHES
// Temperature 0 = mantém fidelidade (não inventa)
// topP 0.15 = permite explorar mais variações de densidade (captura mais detalhes)
// topK 10 = permite mais nuances na representação de profundidade e texturas
const topographicModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // Determinístico - fidelidade 100% ao original
    topP: 0.15,        // Máxima riqueza - captura micro-detalhes e variações tonais
    topK: 10,          // Top 10 tokens - permite 7 níveis de profundidade distintos
  },
});


// Modelo para LINHAS - SIMPLICIDADE E LIMPEZA
// Parâmetros mais restritivos para manter simplicidade
// topP 0.08 = moderado - simples mas funcional
// topK 4 = limitado - menos variação = mais limpo
const linesModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // Determinístico - fidelidade 100% ao original
    topP: 0.15,        // Máxima riqueza - captura micro-detalhes e variações tonais
    topK: 10,          // Top 10 tokens - permite 7 níveis de profundidade distintos
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
// Configuração otimizada para detalhes
const dedicatedEnhanceModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0, // ZERO criatividade para garantir que o que é humano continue humano
    topP: 0.1,
    topK: 1,
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
  style: 'standard' | 'perfect_lines' = 'standard'
): Promise<string> {
  // INVERTIDO: standard = LINHAS, perfect_lines = TOPOGRÁFICO
  // USANDO PROMPTS OTIMIZADOS (~50% menores) para melhor velocidade
  const systemInstruction = style === 'standard'
    ? PERFECT_LINES_INSTRUCTION_OPTIMIZED
    : TOPOGRAPHIC_INSTRUCTION_OPTIMIZED;

  // Seleção inteligente de modelo
  const model = style === 'standard' ? linesModel : topographicModel;

  // Log detalhado para debug
  const modeInfo = style === 'standard'
    ? 'LINHAS DETALHADAS (temp: 0, topP: 0.15, topK: 10) - TODOS DETALHES, LINHAS LIMPAS'
    : 'TOPOGRÁFICO V3.0 (temp: 0, topP: 0.15, topK: 10) - 7 NÍVEIS, MÁXIMA RIQUEZA';

  // Construir prompt final
  const fullPrompt = `${systemInstruction}\n\n${promptDetails ? `DETALHES ADICIONAIS: ${promptDetails}\n\n` : ''}Converta esta imagem em estêncil de tatuagem seguindo as instruções acima.`;

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
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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

// Gerar ideia de tatuagem a partir de texto
export async function generateTattooIdea(
  prompt: string,
  size: 'A4' | 'A3' | '1K' | '2K' | '4K' = 'A4'
): Promise<string> {
  const resolutionMap = {
    'A4': '2480x3508px (A4 - 21x29.7cm @ 300 DPI)',
    'A3': '3508x4961px (A3 - 29.7x42cm @ 300 DPI)',
    '1K': '1024x1024px',
    '2K': '2048x2048px',
    '4K': '4096x4096px'
  };

  const tattooPrompt = `ATUE COMO: Artista especialista em design de tatuagem hiper-realista.

MISSÃO: Criar uma arte de tatuagem FOTORREALISTA baseada nesta descrição do cliente:

"${prompt}"

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

GERE A IMAGEM AGORA:`;

  // Usar retry logic para lidar com falhas temporárias do Gemini
  return retryGeminiAPI(async () => {
    try {
      const result = await textToImageModel.generateContent(tattooPrompt);
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
  const prompt = `ACT AS: Precision Image Restoration Engine.

MISSION: Perform an absolute high-fidelity reconstruction. You are a digital restorer, NOT an artist. 

STRICT IDENTITY RULES:
1. SUBJECT INTEGRITY: Every person, face, and object must retain its exact species, age, and identity. A child must remain a child.
2. ANATOMICAL MAPPING: Every pixel must be anchored to the original geometry. Do NOT move, change, or hallucinate features.
3. CONTENT PRESERVATION: Do NOT add objects or transform the nature of what is in the image.

RECONSTRUCTION TASKS:
- Apply super-resolution to increase optical sharpness.
- Reconstruct high-frequency textures (skin pores, fabric, edges) with professional clarity.
- Remove digital noise and compression artifacts without over-smoothing.
- Re-render with modern optical clarity while keeping the exact original lighting layout.

OUTPUT: Return ONLY the reconstructed image. No text.

EXECUTE ZERO-CREATIVITY HIGH-FIDELITY RESTORATION NOW:`;

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
