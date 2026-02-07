/**
 * Utilitários para a ferramenta de desenho
 */

import { getStroke } from 'perfect-freehand';
import type { Point, StrokeOptions } from './types';

/**
 * Gera um ID único para strokes
 */
export function generateStrokeId(): string {
  return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Converte array de pontos do perfect-freehand para SVG path
 * Usa curvas Bezier CÚBICAS para máxima suavidade (técnica Procreate)
 *
 * Curvas cúbicas (C) são mais suaves que quadráticas (Q) porque
 * usam 2 pontos de controle ao invés de 1, permitindo transições
 * mais naturais entre segmentos.
 */
export function getSvgPathFromStroke(stroke: number[][], closed = true): string {
  if (!stroke.length) return '';

  if (stroke.length === 1) {
    const [x, y] = stroke[0];
    return `M ${x.toFixed(2)},${y.toFixed(2)} Z`;
  }

  if (stroke.length === 2) {
    const [[x0, y0], [x1, y1]] = stroke;
    return `M ${x0.toFixed(2)},${y0.toFixed(2)} L ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  }

  // Usar curvas Bézier cúbicas para máxima suavidade
  const d: string[] = [`M ${stroke[0][0].toFixed(2)},${stroke[0][1].toFixed(2)}`];

  for (let i = 0; i < stroke.length - 1; i++) {
    const p0 = stroke[Math.max(0, i - 1)];
    const p1 = stroke[i];
    const p2 = stroke[i + 1];
    const p3 = stroke[Math.min(stroke.length - 1, i + 2)];

    // Calcular pontos de controle para curva Bézier cúbica
    // Usando tensão de 0.5 para curvas suaves mas responsivas
    const tension = 0.5;

    // Ponto de controle 1: baseado na tangente em p1
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3;

    // Ponto de controle 2: baseado na tangente em p2
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3;

    d.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`);
  }

  if (closed) {
    d.push('Z');
  }

  return d.join(' ');
}

/**
 * Converte pontos para o formato que perfect-freehand espera
 */
export function pointsToStrokeInput(points: Point[]): [number, number, number][] {
  return points.map(p => [p.x, p.y, p.pressure]);
}

/**
 * Gera o outline do stroke usando perfect-freehand
 */
export function generateStrokeOutline(
  points: Point[],
  options: Partial<StrokeOptions> = {}
): number[][] {
  if (points.length < 2) return [];

  const defaultOptions: StrokeOptions = {
    size: 4,
    thinning: 0.4,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t) => t,
    start: {
      cap: true,
      taper: 0,
      easing: (t) => t,
    },
    end: {
      cap: true,
      taper: 0,
      easing: (t) => t,
    },
    simulatePressure: false,
    last: true,
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const inputPoints = pointsToStrokeInput(points);

  return getStroke(inputPoints, mergedOptions);
}

/**
 * Simplifica pontos usando algoritmo Ramer-Douglas-Peucker
 * Reduz número de pontos mantendo a forma
 */
export function simplifyPoints(points: Point[], tolerance = 1): Point[] {
  if (points.length <= 2) return points;

  // Encontrar o ponto mais distante da linha entre primeiro e último
  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // Se a distância máxima é maior que a tolerância, recursivamente simplificar
  if (maxDistance > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Calcula a distância perpendicular de um ponto a uma linha
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;

  return Math.sqrt(Math.pow(point.x - nearestX, 2) + Math.pow(point.y - nearestY, 2));
}

/**
 * Calcula a velocidade entre dois pontos (para simulação de pressão)
 */
export function calculateVelocity(p1: Point, p2: Point, dt: number): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance / Math.max(dt, 1);
}

/**
 * Simula pressão baseado na velocidade (para mouse/touch sem pressão)
 */
export function simulatePressureFromVelocity(
  velocity: number,
  minPressure = 0.2,
  maxPressure = 0.8
): number {
  // Velocidade baixa = alta pressão, velocidade alta = baixa pressão
  const normalizedVelocity = Math.min(velocity / 10, 1);
  return maxPressure - normalizedVelocity * (maxPressure - minPressure);
}

/**
 * Prediz o próximo ponto baseado em velocidade (ink prediction)
 * Reduz latência percebida
 */
export function predictNextPoint(points: Point[], predictionMs = 30): Point | null {
  if (points.length < 2) return null;

  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];

  // Calcular velocidade
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;

  // Fator de predição (assumindo 60fps = 16.67ms por frame)
  const dt = 16.67;
  const factor = predictionMs / dt;

  return {
    x: p2.x + vx * factor,
    y: p2.y + vy * factor,
    pressure: p2.pressure,
  };
}

/**
 * Interpola pontos usando Catmull-Rom spline para suavidade extra
 * Técnica usada pelo Procreate para traços ultra-suaves
 *
 * IMPORTANTE: Para eliminar o efeito "quadrado" em tablets:
 * - Usar segments >= 4 para movimento normal
 * - Usar segments >= 8 para resultado final
 */
export function interpolatePoints(points: Point[], segments = 4): Point[] {
  if (points.length < 2) return points;

  // Para poucos pontos, duplicar extremos para permitir interpolação
  if (points.length < 4) {
    // Criar pontos fantasma nas extremidades para curvas suaves
    const extended = [
      points[0], // Duplicar primeiro ponto
      ...points,
      points[points.length - 1], // Duplicar último ponto
    ];
    return interpolatePointsInternal(extended, segments);
  }

  return interpolatePointsInternal(points, segments);
}

/**
 * Implementação interna da interpolação Catmull-Rom
 */
function interpolatePointsInternal(points: Point[], segments: number): Point[] {
  const result: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calcular distância entre p1 e p2 para ajustar número de segmentos
    const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

    // Mais segmentos para distâncias maiores (pontos mais espaçados = mais interpolação necessária)
    const adaptiveSegments = Math.max(segments, Math.ceil(distance / 5));

    for (let j = 0; j < adaptiveSegments; j++) {
      const t = j / adaptiveSegments;
      const point = catmullRom(p0, p1, p2, p3, t);
      result.push(point);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Suaviza a pressão entre pontos para evitar mudanças bruscas
 * Essencial para qualidade Procreate
 */
export function smoothPressure(points: Point[], windowSize = 3): Point[] {
  if (points.length < windowSize) return points;

  return points.map((point, i) => {
    // Janela deslizante para média ponderada
    let totalPressure = 0;
    let totalWeight = 0;

    for (let j = -Math.floor(windowSize / 2); j <= Math.floor(windowSize / 2); j++) {
      const idx = i + j;
      if (idx >= 0 && idx < points.length) {
        // Peso maior para pontos mais próximos
        const weight = 1 - Math.abs(j) / (windowSize / 2 + 1);
        totalPressure += points[idx].pressure * weight;
        totalWeight += weight;
      }
    }

    return {
      ...point,
      pressure: totalWeight > 0 ? totalPressure / totalWeight : point.pressure,
    };
  });
}

/**
 * Aplica todas as otimizações de suavização para qualidade Procreate
 */
export function processPointsForProcreateQuality(
  points: Point[],
  options: {
    interpolationSegments?: number;
    pressureSmoothing?: number;
  } = {}
): Point[] {
  const { interpolationSegments = 2, pressureSmoothing = 3 } = options;

  if (points.length < 2) return points;

  // 1. Suavizar pressão
  let processed = smoothPressure(points, pressureSmoothing);

  // 2. Interpolar com Catmull-Rom
  // Agora interpolamos mesmo para traços curtos, pois interpolatePoints 
  // já trata a duplicação de pontos internos para suavidade extra.
  processed = interpolatePoints(processed, interpolationSegments);

  return processed;
}

/**
 * Interpolação Catmull-Rom para um ponto
 */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  const pressure =
    0.5 *
    (2 * p1.pressure +
      (-p0.pressure + p2.pressure) * t +
      (2 * p0.pressure - 5 * p1.pressure + 4 * p2.pressure - p3.pressure) * t2 +
      (-p0.pressure + 3 * p1.pressure - 3 * p2.pressure + p3.pressure) * t3);

  return { x, y, pressure: Math.max(0, Math.min(1, pressure)) };
}

/**
 * Converte coordenadas de evento para coordenadas do canvas
 */
export function getCanvasCoordinates(
  e: PointerEvent | React.PointerEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

/**
 * Merge múltiplos SVG paths em um
 */
export function mergeSvgPaths(paths: string[]): string {
  return paths.filter(Boolean).join(' ');
}

/**
 * Converte canvas para base64 PNG
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Carrega imagem como ImageBitmap para renderização otimizada
 */
export async function loadImageBitmap(src: string): Promise<ImageBitmap> {
  const response = await fetch(src);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * Debounce function para otimização
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function para limitar taxa de execução
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
