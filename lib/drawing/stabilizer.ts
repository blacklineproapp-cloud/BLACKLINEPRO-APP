/**
 * Stroke Stabilization & Drawing Utilities
 *
 * Extraído de components/drawing/DrawingCanvas.tsx para:
 * 1. Separar lógica de processamento do componente React
 * 2. Permitir testes unitários independentes
 * 3. Reutilização em outros contextos (ex: server-side rendering)
 *
 * Implementa técnicas do Procreate:
 * - Double Exponential Smoothing (Holt-Winters)
 * - Adaptive speed-based smoothing
 * - Motion filtering (moving average)
 */

// =============================================================================
// FUNÇÕES UTILITÁRIAS
// =============================================================================

/**
 * Curva de pressão avançada estilo Procreate
 * Transforma pressão linear em resposta mais natural
 */
export function advancedPressureCurve(pressure: number): number {
  const p = Math.max(0, Math.min(1, pressure));
  return Math.pow(p, 0.7) * (1 - 0.3 * Math.pow(1 - p, 2));
}

/**
 * Easing function suave para início/fim do traço
 * Cria transições naturais como no Procreate
 */
export function smoothEasing(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Detecta se é um dispositivo touch (iPad, tablet, celular)
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /iPad|iPhone|iPod|Android/i.test(navigator.userAgent)
  );
}

/**
 * Detecta se é iOS (iPad/iPhone) para otimizações específicas
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Converte outline do perfect-freehand para SVG path
 * Usa curvas Bézier cúbicas para máxima suavidade (técnica Procreate)
 */
export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  if (stroke.length === 1) {
    const [x, y] = stroke[0];
    return `M ${x.toFixed(2)},${y.toFixed(2)} Z`;
  }

  if (stroke.length === 2) {
    const [[x0, y0], [x1, y1]] = stroke;
    return `M ${x0.toFixed(2)},${y0.toFixed(2)} L ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  }

  const d: string[] = [`M ${stroke[0][0].toFixed(2)},${stroke[0][1].toFixed(2)}`];

  for (let i = 0; i < stroke.length - 1; i++) {
    const p0 = stroke[Math.max(0, i - 1)];
    const p1 = stroke[i];
    const p2 = stroke[i + 1];
    const p3 = stroke[Math.min(stroke.length - 1, i + 2)];

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) {
      d.push(`L ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`);
      continue;
    }

    const tension = 0.2;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;

    d.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`);
  }

  d.push('Z');
  return d.join(' ');
}

// =============================================================================
// STROKE STABILIZER CLASS
// =============================================================================

/**
 * Stroke Stabilizer - "Lazy Brush" effect
 * Suaviza tremores da mão mantendo precisão
 * Otimizado para dispositivos touch com maior suavização
 *
 * Implementa Double Exponential Smoothing (Holt-Winters)
 * com filtragem de micro-tremores via média móvel.
 */
export class StrokeStabilizer {
  private x: number = 0;
  private y: number = 0;
  private dx: number = 0;
  private dy: number = 0;
  private initialized: boolean = false;

  private alpha: number = 0.5;
  private beta: number = 0.5;

  private filterBuffer: { x: number; y: number }[] = [];
  private maxFilterSize: number = 3;

  reset() {
    this.initialized = false;
    this.filterBuffer = [];
  }

  setSmoothing(factor: number, filterSize: number = 3) {
    this.alpha = 1 - Math.pow(factor, 0.5) * 0.85;
    this.beta = 1 - Math.pow(factor, 0.3) * 0.75;
    this.maxFilterSize = Math.max(1, Math.floor(filterSize));
  }

  /**
   * Estabiliza o movimento com suavidade adaptativa à velocidade
   */
  stabilize(targetX: number, targetY: number, velocity: number = 1): { x: number; y: number } {
    // 1. Filtragem de Movimento (Média Móvel simples)
    this.filterBuffer.push({ x: targetX, y: targetY });
    if (this.filterBuffer.length > this.maxFilterSize) {
      this.filterBuffer.shift();
    }

    const filtered = this.filterBuffer.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    const avgX = filtered.x / this.filterBuffer.length;
    const avgY = filtered.y / this.filterBuffer.length;

    if (!this.initialized) {
      this.x = avgX;
      this.y = avgY;
      this.dx = 0;
      this.dy = 0;
      this.initialized = true;
      return { x: avgX, y: avgY };
    }

    // 2. Adaptive smoothing: slow → precise, fast → stable
    const speedFactor = Math.min(velocity / 2, 1);
    const adaptiveAlpha = 0.9 - (speedFactor * (0.9 - this.alpha));

    const prevX = this.x;
    const prevY = this.y;

    // Level (Double Exponential Smoothing)
    this.x = adaptiveAlpha * avgX + (1 - adaptiveAlpha) * (this.x + this.dx);
    this.y = adaptiveAlpha * avgY + (1 - adaptiveAlpha) * (this.y + this.dy);

    // Trend (Streamline)
    this.dx = this.beta * (this.x - prevX) + (1 - this.beta) * this.dx;
    this.dy = this.beta * (this.y - prevY) + (1 - this.beta) * this.dy;

    return { x: this.x, y: this.y };
  }
}
