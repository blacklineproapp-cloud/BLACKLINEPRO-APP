/**
 * Types para o sistema de ajustes de Stencil
 * Centraliza interfaces usadas tanto no client quanto server
 */

// Controles de ajuste (SIMPLIFICADOS - apenas essenciais)
export interface AdjustControls {
  // Ajustes Tonais Essenciais
  brightness: number;        // -100 a +100 (padrão: 0)
  contrast: number;          // -100 a +100 (padrão: 0)
  threshold: number;         // 0 a 255 (padrão: 128)
  gamma: number;             // 0.5 a 2.0 (padrão: 1.0)

  // Transformações Geométricas
  rotation: number;          // -180 a +180 graus (padrão: 0)
  flipHorizontal: boolean;   // Espelhar horizontal (padrão: false)
  flipVertical: boolean;     // Espelhar vertical (padrão: false)

  // Inversão
  invert: boolean;           // Inverter cores (padrão: false)

  // Nitidez (opcional)
  sharpen: boolean;          // Aplicar sharpen (padrão: false)
  sharpenAmount: number;     // 0.5 a 3.0 (padrão: 1.0)

  // Suavização (opcional)
  removeNoise: boolean;      // Remover ruído (padrão: false)
  noiseReduction: number;    // 0.5 a 2.0 (padrão: 1.0)
}

// Controles específicos do Modo Topográfico
export interface TopographicControls {
  lineSpacing: number;        // 1 a 20 pixels (espaçamento entre curvas)
  lineThickness: number;      // 1 a 5 pixels (espessura das linhas)
  smoothness: number;         // 0 a 10 (suavização das curvas)
  detailLevel: number;        // 1 a 10 (quantidade de curvas de nível)
}

// Controles específicos do Modo Linhas Perfeitas
export interface LineControls {
  vectorThreshold: number;    // 0 a 255 (simplificação de vetores)
  minLineLength: number;      // 5 a 50 pixels (remove linhas pequenas)
  cornerSmoothing: number;    // 0 a 10 (suaviza cantos)
  simplification: number;     // 0 a 10 (reduz pontos de vetor)
}

// Valores padrão dos controles (SIMPLIFICADOS)
export const DEFAULT_ADJUST_CONTROLS: AdjustControls = {
  // Ajustes Tonais
  brightness: 0,
  contrast: 0,
  threshold: 128,
  gamma: 1.0,

  // Transformações
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  invert: false,

  // Nitidez
  sharpen: false,
  sharpenAmount: 1.0,

  // Suavização
  removeNoise: false,
  noiseReduction: 1.0
};

// Presets pré-configurados (SIMPLIFICADOS - apenas com controles essenciais)
export interface StencilPreset {
  name: string;
  description: string;
  controls: Partial<AdjustControls>;
}

export const STENCIL_PRESETS: Record<string, StencilPreset> = {
  delicate: {
    name: 'Delicado',
    description: 'Linhas suaves e baixo contraste para designs delicados',
    controls: {
      contrast: -15,
      brightness: 5,
      gamma: 1.2,
      sharpen: false,
      threshold: 140
    }
  },
  bold: {
    name: 'Intenso',
    description: 'Alto contraste e linhas marcadas para designs fortes',
    controls: {
      contrast: 25,
      brightness: -5,
      gamma: 1.0,
      sharpen: true,
      sharpenAmount: 1.5,
      threshold: 115
    }
  },
  minimal: {
    name: 'Minimalista',
    description: 'Máxima simplificação, apenas linhas essenciais',
    controls: {
      threshold: 165,
      contrast: 20,
      brightness: 0,
      gamma: 1.0
    }
  },
  detailed: {
    name: 'Detalhado',
    description: 'Preserva todos os detalhes e nuances',
    controls: {
      threshold: 110,
      contrast: -10,
      brightness: 3,
      gamma: 1.1,
      sharpen: true,
      sharpenAmount: 1.0
    }
  },
  clean: {
    name: 'Limpo',
    description: 'Remove ruídos e suaviza imperfeições',
    controls: {
      removeNoise: true,
      noiseReduction: 1.0,
      contrast: 15,
      threshold: 128,
      gamma: 1.0,
      sharpen: true,
      sharpenAmount: 0.5
    }
  }
};

// Estado do histórico de edições
export interface EditorHistoryState {
  image: string;              // Base64 da imagem
  controls: AdjustControls;   // Controles aplicados
  timestamp: number;          // Timestamp da ação
}

export interface EditorHistory {
  states: EditorHistoryState[];
  currentIndex: number;
  maxHistory: number;         // Limite de 20 estados
}

// Validação de qualidade do stencil
export interface StencilQuality {
  hasContent: boolean;        // Não está em branco
  resolution: boolean;        // Resolução mínima 150 DPI
  contrast: boolean;          // Contraste mínimo de 30%
  printable: boolean;         // Imprimível (todas verificações OK)
  score: number;              // 0-100
  warnings: string[];         // Avisos
  suggestions: string[];      // Sugestões
}
