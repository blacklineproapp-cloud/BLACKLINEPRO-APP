/**
 * Componentes de Desenho
 * Exporta todos os componentes e tipos relacionados ao desenho
 */

export { default as DrawingCanvas } from './DrawingCanvas';
export { default as DrawingToolbar } from './DrawingToolbar';
export { default as DrawingEditor } from './DrawingEditor';

export type { DrawingCanvasRef } from './DrawingCanvas';

// Re-exportar tipos
export type {
  Point,
  Stroke,
  DrawingTool,
  BrushPreset,
  DrawingState,
  StrokeOptions,
} from '@/lib/drawing/types';

export { BRUSH_PRESETS, ERASER_SIZES } from '@/lib/drawing/types';

// Re-exportar utilitários
export {
  generateStrokeId,
  getSvgPathFromStroke,
  generateStrokeOutline,
  getCanvasCoordinates,
  predictNextPoint,
  interpolatePoints,
  simplifyPoints,
  canvasToBase64,
} from '@/lib/drawing/utils';
