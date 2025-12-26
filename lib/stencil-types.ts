/**
 * Types para o sistema de ajustes de Stencil
 * Centraliza interfaces usadas tanto no client quanto server
 */

// Controles de ajuste
export interface AdjustControls {
  // Intensidade e contraste
  brightness: number;        // -150 a +150 (padrão: 0)
  contrast: number;           // -100 a +100 (padrão: 0)
  threshold: number;          // 0 a 255 (padrão: 128)
  gamma: number;              // 1.0 a 3.0 (padrão: 1.0) - Sharp só aceita >= 1.0

  // Ferramentas Profissionais (Photoshop-style)
  posterize?: number | null;  // 2 a 255 níveis tonais (padrão: null - desativado)
  levels?: {                  // Ajuste fino de tons (substitui gamma limitado)
    inputBlack?: number;      // 0-254 (padrão: 0) - ponto de preto puro (DEVE ser < inputWhite)
    inputGray?: number;       // 1.0-3.0 (padrão: 1.0) - gamma dos meios-tons (Sharp só aceita >= 1.0)
    inputWhite?: number;      // 1-255 (padrão: 255) - ponto de branco puro (DEVE ser > inputBlack)
    outputBlack?: number;     // 0-254 (padrão: 0) - remapear preto para
    outputWhite?: number;     // 1-255 (padrão: 255) - remapear branco para
  } | null;
  findEdges?: boolean;        // Detectar bordas (padrão: false)
  edgeStrength?: number;      // 0-100 (padrão: 50) - força da detecção
  clarity?: number;           // -100 a +100 (padrão: 0) - contraste local

  // Transformações
  rotation: number;           // -180 a +180 graus (padrão: 0)
  flipHorizontal: boolean;    // Espelhar horizontal (padrão: false)
  flipVertical: boolean;      // Espelhar vertical (padrão: false)

  // Inversão
  invert: boolean;            // Inverter cores (padrão: false)

  // Limpeza (opcional)
  removeNoise: boolean;       // Remover ruído (padrão: false)
  noiseReduction: number;     // 0 a 10 (sigma do blur) (padrão: 1)
  sharpen: boolean;           // Aplicar sharpen (padrão: false)
  sharpenAmount: number;      // 0 a 10 (padrão: 1)
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

// Valores padrão dos controles
export const DEFAULT_ADJUST_CONTROLS: AdjustControls = {
  brightness: 0,
  contrast: 0,
  threshold: 128,
  gamma: 1.0,

  // Ferramentas profissionais (desativadas por padrão)
  posterize: null,
  levels: null,
  findEdges: false,
  edgeStrength: 50,
  clarity: 0,

  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  invert: false,
  removeNoise: false,
  noiseReduction: 1,
  sharpen: false,
  sharpenAmount: 1
};

// Presets pré-configurados
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
      gamma: 1.0, // Sharp.js não aceita gamma < 1.0
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
      sharpenAmount: 1
    }
  },
  clean: {
    name: 'Limpo',
    description: 'Remove ruídos e suaviza imperfeições',
    controls: {
      removeNoise: true,
      noiseReduction: 1,
      contrast: 15,
      threshold: 128,
      gamma: 1.0,
      sharpen: true,
      sharpenAmount: 0.5
    }
  },
  photoStencil: {
    name: 'Foto → Stencil',
    description: 'Detecta bordas para converter fotos em stencils de linha',
    controls: {
      findEdges: true,
      edgeStrength: 70,
      threshold: 180,
      invert: false,
      clarity: 20
    }
  },
  professional: {
    name: 'Profissional',
    description: 'Ajustes profissionais com Levels e Posterize',
    controls: {
      posterize: 8,
      levels: {
        inputBlack: 30,
        inputGray: 1.2,
        inputWhite: 225,
        outputBlack: 0,
        outputWhite: 255
      },
      clarity: 15,
      sharpen: true,
      sharpenAmount: 1.2
    }
  },
  highContrast: {
    name: 'Alto Contraste',
    description: 'Máximo contraste para stencils ultra-definidos',
    controls: {
      posterize: 4,
      clarity: 30,
      threshold: 128,
      contrast: 30,
      sharpen: true,
      sharpenAmount: 2
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
