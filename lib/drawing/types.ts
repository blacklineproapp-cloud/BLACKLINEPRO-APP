/**
 * Tipos para a ferramenta de desenho
 */

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  path: string;
  color: string;
  size: number;
  tool: DrawingTool;
  timestamp: number;
}

export type DrawingTool = 'pen' | 'eraser' | 'line';

export interface BrushPreset {
  name: string;
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  color: string;
  icon?: string;
}

export interface DrawingState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  tool: DrawingTool;
  brushSize: number;
  brushColor: string;
  isDrawing: boolean;
}

export interface DrawingHistoryState {
  strokes: Stroke[];
  timestamp: number;
}

export interface StrokeOptions {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  easing?: (t: number) => number;
  start?: {
    cap: boolean;
    taper: number | boolean;
    easing?: (t: number) => number;
  };
  end?: {
    cap: boolean;
    taper: number | boolean;
    easing?: (t: number) => number;
  };
  simulatePressure: boolean;
  last: boolean;
}

// Presets de brush otimizados para stencil
export const BRUSH_PRESETS: Record<string, BrushPreset> = {
  fine: {
    name: 'Fino',
    size: 2,
    thinning: 0.3,
    smoothing: 0.7,
    streamline: 0.6,
    color: '#000000',
  },
  medium: {
    name: 'Médio',
    size: 4,
    thinning: 0.4,
    smoothing: 0.5,
    streamline: 0.5,
    color: '#000000',
  },
  thick: {
    name: 'Grosso',
    size: 8,
    thinning: 0.2,
    smoothing: 0.4,
    streamline: 0.4,
    color: '#000000',
  },
  detail: {
    name: 'Detalhe',
    size: 1,
    thinning: 0.5,
    smoothing: 0.8,
    streamline: 0.7,
    color: '#000000',
  },
};

// Configurações de eraser
export const ERASER_SIZES = {
  small: 10,
  medium: 20,
  large: 40,
};
