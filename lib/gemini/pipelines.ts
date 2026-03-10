import { retryGeminiAPI } from '../retry';
import { SIMPLIFY_TOPOGRAPHIC_TO_LINES } from '../prompts-optimized';
import { logger } from '../logger';
import { linesModel } from './models-config';
import { generateStencilFromImage } from './stencil-generation';

// Pipeline 2-etapas: Topográfico → Linhas (Modo Experimental)
export async function generateLinesFromTopographic(
  base64Image: string,
  promptDetails: string = ''
): Promise<{ topographic: string; lines: string; totalTime: number }> {
  const startTime = Date.now();

  logger.info('[Pipeline 2-Etapas] Iniciando: Topográfico → Linhas');

  try {
    // ETAPA 1: Gerar topográfico detalhado (7 níveis)
    logger.info('[Pipeline 2-Etapas] ETAPA 1: Gerando topográfico...');
    const topographicStencil = await generateStencilFromImage(
      base64Image,
      promptDetails,
      'perfect_lines' // Topográfico V3.0
    );
    logger.info('[Pipeline 2-Etapas] ✅ Topográfico gerado');

    // ETAPA 2: Simplificar topográfico para linhas
    logger.info('[Pipeline 2-Etapas] ETAPA 2: Simplificando para linhas...');

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
            logger.info('[Gemini] Pipeline 2-etapas concluído', { totalTimeMs: totalTime });

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
    logger.error('[Pipeline 2-Etapas] Erro:', error);
    throw error;
  }
}
