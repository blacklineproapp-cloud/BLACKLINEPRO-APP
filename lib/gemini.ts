import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryGeminiAPI } from './retry';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Modelo para TOPOGRÁFICO - temperatura BAIXA para máxima consistência e detalhes precisos
const topographicModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.2,
    topP: 0.85,
    topK: 20,
  },
});

// Modelo para LINHAS - temperatura um pouco mais alta para contornos fluidos
const linesModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.3,
    topP: 0.9,
    topK: 32,
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

// ====================================================================
// PROMPT TOPOGRÁFICO (Curvas de nível, máximo detalhe, densidade)
// ====================================================================
const TOPOGRAPHIC_INSTRUCTION = `ATUE COMO: Mestre em Mapeamento de Tatuagem Realista e Topografia.

MISSÃO:
Gerar um "Mapa Topográfico" de ALTA PRECISÃO com MÁXIMO DE DETALHES para tatuadores profissionais.

CONCEITO - A METÁFORA DO MAPA GEOGRÁFICO:
Trate a pele/imagem como um terreno geográfico 3D com curvas de nível (isolinhas):
- Altitude ALTA (Montanha) = Áreas CLARAS/Brilho → Linhas ESPAÇADAS
- Altitude BAIXA (Vale) = Áreas ESCURAS/Sombra → Linhas PRÓXIMAS (densidade alta)

DIRETRIZES ESTRITAS PARA TATUADORES:

1. LUZ E SOMBRA COMO LINHAS DE CONTORNO (Isolinhas):
   - Converta TODOS os gradientes em linhas de contorno
   - Linhas PRÓXIMAS = Sombra densa (declive acentuado no "terreno")
   - Linhas ESPAÇADAS = Luz/sombra suave (terreno plano)
   - ZERO sombreado sólido
   - ZERO hachuras ou pontilhismo
   - ZERO preenchimento preto
   - Apenas linhas puras que seguem o volume

2. CABELOS E BARBAS - FLUXO E DIREÇÃO:
   - Desenhe a DIREÇÃO dos fios, NÃO a massa sólida
   - Mostre o fluxo como vetores/linhas direcionais
   - Isto ajuda o tatuador a saber para onde puxar a agulha
   - Cada linha representa o caminho de um fio

3. DEFINIÇÃO DE VOLUME - CONTORNO TRANSVERSAL:
   - As linhas NÃO são retas paralelas
   - Linhas devem CURVAR "abraçando" a forma do objeto
   - Exemplo: bochechas redondas = linhas curvas seguindo a esfera
   - As linhas seguem a curvatura da anatomia

4. MICRODETALHES E PROFUNDIDADE (MÁXIMA FIDELIDADE):
   - Mapeie TODOS os poros da pele como linhas pequenas
   - Mapeie TODAS as rugas finas e micro-rugas
   - Mapeie TODAS as texturas sutis (pele, tecido, superfícies)
   - Capture MÚLTIPLAS CAMADAS de profundidade:
     * Camada 1: Contornos principais (silhueta, bordas)
     * Camada 2: Volumes médios (músculos, ossos, formas)
     * Camada 3: Detalhes finos (rugas, poros, texturas)
   - Use DENSIDADE VARIÁVEL: mais linhas em áreas escuras, menos em claras
   - Capture a TRIDIMENSIONALIDADE através da curvatura das linhas
   - NÃO omita NENHUM detalhe da imagem original

5. PROFUNDIDADE E DIMENSÃO:
   - Linhas mais GROSSAS para contornos principais (primeiro plano)
   - Linhas mais FINAS para detalhes sutis (fundo/profundidade)
   - Crie sensação de CAMADAS através da densidade
   - Mantenha hierarquia visual: o que está na frente = mais definido

6. ZERO PREENCHIMENTO:
   - Proibido usar preto sólido
   - Proibido usar gradientes suaves
   - Apenas linhas de contorno definidas
   - A profundidade vem da DENSIDADE das linhas, não de manchas

PÚBLICO-ALVO:
Tatuadores profissionais que precisam de máxima referência de volume e detalhes topográficos.

SAÍDA:
Gere APENAS a imagem do estêncil topográfico com MÁXIMA profundidade e densidade. Sem texto.`;

// ====================================================================
// PROMPT LINHAS PERFEITAS (Contornos limpos, bordas definidas, clareza)
// ====================================================================
const PERFECT_LINES_INSTRUCTION = `ATUE COMO: Artista especializado em ilustração vetorial de alta precisão para tatuagem.

MISSÃO:
Criar um estêncil com LINHAS PERFEITAS, CONTORNOS LIMPOS e BORDAS DEFINIDAS para tatuadores profissionais.

CONCEITO - SIMPLICIDADE E CLAREZA:
Transforme a imagem em um desenho de linhas puras, focando em:
- Contornos principais NÍTIDOS e DEFINIDOS
- Bordas LIMPAS sem excesso de informação
- Hierarquia clara: primeiro plano vs. fundo
- Legibilidade máxima para aplicação na pele

DIRETRIZES PARA LINHAS PERFEITAS:

1. CONTORNOS PRINCIPAIS:
   - Identifique as BORDAS PRINCIPAIS de cada elemento
   - Desenhe linhas LIMPAS e CONTÍNUAS
   - Evite linhas tremidas ou hesitantes
   - Foco na SILHUETA e FORMA GERAL
   - Linhas GROSSAS para contornos externos
   - Linhas FINAS para detalhes internos

2. SELETIVIDADE DE DETALHES:
   - NÃO tente capturar TODOS os detalhes
   - Escolha os detalhes ESSENCIAIS para reconhecimento
   - Simplifique texturas complexas em padrões claros
   - Agrupe pequenos detalhes em formas maiores quando possível
   - Priorize CLAREZA sobre QUANTIDADE de linhas

3. HIERARQUIA VISUAL:
   - Primeiro plano: linhas mais grossas e definidas
   - Segundo plano: linhas médias
   - Fundo: linhas finas ou omitidas
   - Crie PROFUNDIDADE através da espessura, não da densidade

4. CABELOS E TEXTURAS:
   - Simplifique cabelos em DIREÇÕES e FLUXOS principais
   - NÃO desenhe cada fio individualmente
   - Use linhas direcionais que mostram o MOVIMENTO
   - Agrupe mechas em formas maiores
   - Mantenha as linhas FLUIDAS e ELEGANTES

5. LIMPEZA E CLAREZA:
   - ZERO preenchimento sólido (a menos que seja crucial)
   - ZERO sombreado com densidade de linhas
   - ZERO texturas complexas desnecessárias
   - Apenas linhas essenciais e bem posicionadas
   - Espaços em branco são BEM-VINDOS (deixam a pele "respirar")

6. ESTILO VETORIAL:
   - Linhas devem parecer desenhadas à mão por um ilustrador habilidoso
   - Curvas suaves e naturais
   - Cantos e encontros limpos
   - Espessura consistente em cada linha
   - Resultado final: elegante, legível, tatável

IMPORTANTE:
- Este é um estêncil de LINHAS, não topográfico
- Menos linhas = mais clareza = melhor aplicação na pele
- Qualidade > Quantidade
- O tatuador precisa VER CLARAMENTE cada linha para tatuar

PÚBLICO-ALVO:
Tatuadores que precisam de um guia limpo e claro de contornos para aplicação precisa.

SAÍDA:
Gere APENAS a imagem do estêncil com linhas limpas e definidas. Sem texto.`;

// Modelo para operações apenas texto (análise de cores)
const textModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
  }
});

// Gerar estêncil a partir de imagem
export async function generateStencilFromImage(
  base64Image: string,
  promptDetails: string = '',
  style: 'standard' | 'perfect_lines' = 'standard'
): Promise<string> {
  // AGORA ESTÁ CORRETO:
  // 'standard' = Topográfico (densidade, detalhes, curvas de nível)
  // 'perfect_lines' = Linhas Perfeitas (contornos limpos, simplicidade)
  
  const systemInstruction = style === 'standard'
    ? TOPOGRAPHIC_INSTRUCTION
    : PERFECT_LINES_INSTRUCTION;

  const model = style === 'standard' ? topographicModel : linesModel;
  
  // Log detalhado para debug
  const modeInfo = style === 'standard' 
    ? 'TOPOGRÁFICO (topographicModel - temp: 0.2 - densidade máxima)' 
    : 'LINHAS PERFEITAS (linesModel - temp: 0.3 - contornos limpos)';
  console.log(`[Gemini] ▶ Gerando estêncil - Modo: ${modeInfo}`);

  // Construir prompt final
  const fullPrompt = `${systemInstruction}\n\n${promptDetails ? `DETALHES ADICIONAIS: ${promptDetails}\n\n` : ''}Converta esta imagem em estêncil de tatuagem seguindo as instruções acima.`;

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  return retryGeminiAPI(async () => {
    try {
      const result = await model.generateContent([
        fullPrompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType: 'image/jpeg',
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
  const prompt = `ATUE COMO: Especialista em restauração e aprimoramento de imagens de alta qualidade.

MISSÃO: Transformar esta imagem em ULTRA HD 4K com qualidade profissional máxima.

ESPECIFICAÇÕES TÉCNICAS:
- Resolução final: 4096x4096px (4K Ultra HD)
- Qualidade: Máxima definição possível
- Formato: Sem perda de qualidade

PROCESSOS DE APRIMORAMENTO:

1. UPSCALING INTELIGENTE:
   - Aumentar resolução para 4K mantendo proporções
   - Usar interpolação inteligente para criar detalhes novos
   - Reconstruir texturas e padrões perdidos
   - Gerar microdetalhes baseados no contexto

2. NITIDEZ E CLAREZA:
   - Aumentar nitidez de forma natural (sem oversharpening)
   - Melhorar definição de bordas e contornos
   - Restaurar detalhes finos (cabelos, texturas, poros)
   - Clarificar áreas embaçadas ou desfocadas

3. REDUÇÃO DE RUÍDO:
   - Remover grain/noise digital
   - Eliminar artefatos de compressão JPEG
   - Suavizar pixelização
   - Limpar imperfeições técnicas

4. OTIMIZAÇÃO DE CORES:
   - Ajustar balanço de brancos
   - Corrigir saturação (cores vibrantes mas naturais)
   - Melhorar contraste de forma equilibrada
   - Restaurar profundidade tonal

5. RESTAURAÇÃO DE DETALHES:
   - Recuperar informações em áreas escuras (shadows)
   - Recuperar informações em áreas claras (highlights)
   - Melhorar textura e profundidade
   - Preservar autenticidade da imagem original

6. QUALIDADE PROFISSIONAL:
   - Resultado deve parecer uma foto profissional
   - Sem exageros ou efeitos artificiais
   - Manter naturalidade
   - Máxima qualidade técnica

IMPORTANTE:
- NÃO adicione elementos que não existem
- NÃO mude a composição ou enquadramento
- NÃO altere o conteúdo, apenas APRIMORE
- Foque em QUALIDADE TÉCNICA, não em mudanças artísticas

RETORNE: A imagem aprimorada em 4K Ultra HD com máxima qualidade.`;

  let mimeType = 'image/jpeg';
  const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const result = await topographicModel.generateContent([
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
  } catch (error: any) {
    console.error('Erro ao aprimorar imagem:', error);
    throw new Error(`Falha ao aprimorar imagem: ${error.message || 'Erro desconhecido'}`);
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

MISSÃO: Analisar cientificamente as cores DOMINANTES desta imagem e criar uma paleta de referência profissional.

ANÁLISE TÉCNICA REQUERIDA:

1. EXTRAÇÃO DE CORES DOMINANTES:
   - Identifique as 6-8 cores MAIS PRESENTES na imagem
   - Calcule os valores RGB/HEX exatos dessas cores
   - Ordene por predominância (mais presente primeiro)
   - Ignore cores muito similares (mescladas)

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

  let mimeType = 'image/jpeg';
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

    let jsonText = text;

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Resposta do Gemini não contém JSON:', text);
      throw new Error('Resposta não contém JSON válido');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    if (!parsedData.summary || !Array.isArray(parsedData.colors)) {
      throw new Error('JSON inválido: faltam campos obrigatórios (summary, colors)');
    }

    return parsedData;
  } catch (error: any) {
    console.error('Erro ao analisar cores:', error);
    throw new Error(`Falha ao analisar cores: ${error.message || 'Erro desconhecido'}`);
  }
}
