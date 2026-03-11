import { retryGeminiAPI } from '../retry';
import { logger, getErrorMessage } from '../logger';
import { getModelsForKey } from './models-config';

// Gerar ideia de tatuagem a partir de texto (e opcionalmente imagem de referência)
export async function generateTattooIdea(
  prompt: string,
  size: 'A4' | 'A3' | '1K' | '2K' | '4K' = 'A4',
  referenceImage?: string, // base64 da imagem
  userApiKey?: string
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

      const result = await getModelsForKey(userApiKey).textToImageModel.generateContent(content);
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
      logger.error('[Gemini] Retornou texto ao invés de imagem:', text);
      throw new Error('Falha ao gerar imagem. O modelo retornou apenas texto.');
    } catch (error: unknown) {
      logger.error('[Gemini] Erro ao gerar ideia com Gemini:', error);
      throw new Error(`Falha ao gerar design: ${getErrorMessage(error) || 'Erro desconhecido'}`);
    }
  }, `Gemini IA Gen (${size})`);
}
