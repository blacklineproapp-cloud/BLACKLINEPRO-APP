import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const defaultApiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(defaultApiKey);

// ─── Safety settings (shared) ────────────────────────────────────────────────
// Relaxed safety configuration for stencils (art can be misinterpreted)
export const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// Modelo para TOPOGRÁFICO V7.0 - MAPEAMENTO TOPOGRÁFICO INTERPRETATIVO
// Temperature 0.4 = permite criar contornos e hatching criativamente
// topP 0.4 = seleção ampla para variar padrões de linhas
// topK 20 = mais opções para criar padrões de hatching diferenciados
// NOTA: temp=0 fazia o modelo apenas COPIAR a foto.
// O topográfico precisa INTERPRETAR a foto e criar linhas NOVAS.
export const topographicModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.4,  // Criatividade para interpretar e criar contornos
    topP: 0.4,         // Amplo o suficiente para variar hatching/textura
    topK: 20,          // Mais opções para padrões de linha diferenciados
  },
  safetySettings,
});


// Modelo para LINHAS - USANDO MESMOS PARÂMETROS DO TOPOGRÁFICO
// Paradoxalmente, parâmetros menos restritivos funcionam melhor
// O Topográfico funcionou sem adicionar elementos, então usamos o mesmo
export const linesModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // ZERO criatividade - fidelidade 100%
    topP: 0.15,        // Mesmo do Topográfico (funcionou)
    topK: 10,          // Mesmo do Topográfico (funcionou)
  },
  safetySettings,
});


// Modelo para ANIME/ILUSTRAÇÃO - Ultra conservador
// Para animes, desenhos, Maori, Tribal e qualquer arte com linhas de contorno fortes
// Objetivo: LIMPAR e PRESERVAR linhas existentes, não criar novas
export const animeModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // ZERO criatividade - apenas limpar
    topP: 0.1,         // Ultra conservador - não adiciona nada
    topK: 5,           // Poucos tokens - mantém simplicidade
  },
  safetySettings,
});


// Modelo para geração de imagens a partir de texto - Gemini 2.5 Flash
export const textToImageModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
  },
  safetySettings,
});

// Modelo DEDICADO para Aprimoramento - Gemini 2.5 Flash
// Configuração otimizada para reconstrução de alta qualidade
export const dedicatedEnhanceModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.1, // Mínima criatividade para permitir reconstrução inteligente de detalhes
    topP: 0.2,        // Conservador mas permite reconstrução de texturas
    topK: 5,          // Poucas opções para manter fidelidade
  },
  safetySettings,
});

// Modelo para operações apenas texto (análise de cores)
export const textModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
  }
});

// ─── BYOK: factory for user-provided API key ──────────────────────────────
// When a user brings their own Gemini key, we instantiate a separate client
// for that request — their generations don't consume the app's quota.
export function getModelsForKey(userApiKey?: string) {
  if (!userApiKey) {
    return { topographicModel, linesModel, animeModel, textToImageModel, dedicatedEnhanceModel, textModel };
  }
  const g = new GoogleGenerativeAI(userApiKey);
  return {
    topographicModel:    g.getGenerativeModel({ model: 'gemini-2.5-flash-image', generationConfig: { temperature: 0.4,  topP: 0.4,  topK: 20 }, safetySettings }),
    linesModel:          g.getGenerativeModel({ model: 'gemini-2.5-flash-image', generationConfig: { temperature: 0,    topP: 0.15, topK: 10 }, safetySettings }),
    animeModel:          g.getGenerativeModel({ model: 'gemini-2.5-flash-image', generationConfig: { temperature: 0,    topP: 0.1,  topK: 5  }, safetySettings }),
    textToImageModel:    g.getGenerativeModel({ model: 'gemini-2.5-flash-image', generationConfig: { temperature: 0.8,  topP: 0.95, topK: 40 }, safetySettings }),
    dedicatedEnhanceModel: g.getGenerativeModel({ model: 'gemini-2.5-flash-image', generationConfig: { temperature: 0.1, topP: 0.2,  topK: 5  }, safetySettings }),
    textModel:           g.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.7, topP: 0.95 } }),
  };
}
