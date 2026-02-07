'use client';

/**
 * DrawingCanvas - Canvas de desenho profissional com precisão de traço
 * Otimizado para Apple Pencil e tablets com pressure sensitivity
 *
 * Implementa técnicas do Procreate:
 * - Stroke stabilization (lazy brush)
 * - Advanced pressure curves
 * - Catmull-Rom interpolation
 * - Natural tapering
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { getStroke } from 'perfect-freehand';
import type { Point, Stroke, DrawingTool } from '@/lib/drawing/types';
import { generateStrokeId, processPointsForProcreateQuality } from '@/lib/drawing/utils';

/**
 * Curva de pressão avançada estilo Procreate
 * Transforma pressão linear em resposta mais natural
 */
function advancedPressureCurve(pressure: number): number {
  // Curva S suave que dá mais controle no meio da faixa de pressão
  // Similar ao comportamento do Procreate
  const p = Math.max(0, Math.min(1, pressure));
  // Função sigmóide modificada para resposta mais natural
  return Math.pow(p, 0.7) * (1 - 0.3 * Math.pow(1 - p, 2));
}

/**
 * Easing function suave para início/fim do traço
 * Cria transições naturais como no Procreate
 */
function smoothEasing(t: number): number {
  // Ease-out cubic - desacelera suavemente
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Detecta se é um dispositivo touch (iPad, tablet, celular)
 */
function isTouchDevice(): boolean {
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
function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Stroke Stabilizer - "Lazy Brush" effect
 * Suaviza tremores da mão mantendo precisão
 * Otimizado para dispositivos touch com maior suavização
 */
class StrokeStabilizer {
  private x: number = 0;
  private y: number = 0;
  private dx: number = 0;
  private dy: number = 0;
  private initialized: boolean = false;

  // Parâmetros para Double Exponential Smoothing
  private alpha: number = 0.5;
  private beta: number = 0.5;

  // Filtragem de movimento (Média Móvel) para remover tremores iniciais
  private filterBuffer: { x: number; y: number }[] = [];
  private maxFilterSize: number = 3; // Ajustável conforme o prop 'motionFiltering'

  reset() {
    this.initialized = false;
    this.filterBuffer = [];
  }

  setSmoothing(factor: number, filterSize: number = 3) {
    // alpha: peso da posição (suavidade)
    // beta: peso da tendência (antecipação - streamline)
    this.alpha = 1 - Math.pow(factor, 0.5) * 0.85;
    this.beta = 1 - Math.pow(factor, 0.3) * 0.75;
    this.maxFilterSize = Math.max(1, Math.floor(filterSize));
  }

  /**
   * Estabiliza o movimento com suavidade adaptativa à velocidade
   * @param targetX Coordenada X bruta
   * @param targetY Coordenada Y bruta
   * @param velocity Velocidade atual do movimento (opcional)
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

    // 2. INVERTER A LÓGICA (Procreate Insight):
    // Movimento lento (velocity baixa) = Alpha ALTO (mais precisão, menos suavização)
    // Movimento rápido (velocity alta) = Alpha BAIXO (mais estabilização)
    const speedFactor = Math.min(velocity / 2, 1);
    const adaptiveAlpha = 0.9 - (speedFactor * (0.9 - this.alpha));

    const prevX = this.x;
    const prevY = this.y;

    // Double Exponential Smoothing (Holt-Winters)
    // Level
    this.x = adaptiveAlpha * avgX + (1 - adaptiveAlpha) * (this.x + this.dx);
    this.y = adaptiveAlpha * avgY + (1 - adaptiveAlpha) * (this.y + this.dy);

    // Trend (Streamline)
    this.dx = this.beta * (this.x - prevX) + (1 - this.beta) * this.dx;
    this.dy = this.beta * (this.y - prevY) + (1 - this.beta) * this.dy;

    return { x: this.x, y: this.y };
  }
}

export interface DrawingCanvasRef {
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  getStrokes: () => Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  exportAsDataUrl: () => string;
  exportStencilOnly: () => string; // Exporta apenas stencil + desenhos (sem imagem original)
  getCanvas: () => HTMLCanvasElement | null;
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  originalImage?: string;      // Imagem original (fundo - referência)
  stencilImage?: string;       // Stencil gerado (camada do meio)
  stencilOpacity?: number;     // Opacidade do stencil (0-100)
  backgroundImage?: string;    // Legacy: se não tiver original/stencil separados
  tool?: DrawingTool;
  brushSize?: number;
  brushColor?: string;
  stabilization?: number;      // Nível de estabilização 0-100 (0=off, 100=máximo)
  streamline?: number;         // Força da tendência do traço 0-100 (Procreate)
  motionFiltering?: number;    // Filtragem de micro-tremores (quantidade de pontos)
  onStrokeStart?: () => void;
  onStrokeEnd?: (stroke: Stroke) => void;
  onStrokesChange?: (strokes: Stroke[]) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Converte outline do perfect-freehand para SVG path
 * Usa curvas Bézier cúbicas para máxima suavidade (técnica Procreate)
 */
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  if (stroke.length === 1) {
    const [x, y] = stroke[0];
    return `M ${x.toFixed(2)},${y.toFixed(2)} Z`;
  }

  if (stroke.length === 2) {
    const [[x0, y0], [x1, y1]] = stroke;
    return `M ${x0.toFixed(2)},${y0.toFixed(2)} L ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  }

  // Usar geometria híbrida para evitar loops e serrilhados curvos
  const d: string[] = [`M ${stroke[0][0].toFixed(2)},${stroke[0][1].toFixed(2)}`];

  for (let i = 0; i < stroke.length - 1; i++) {
    const p0 = stroke[Math.max(0, i - 1)];
    const p1 = stroke[i];
    const p2 = stroke[i + 1];
    const p3 = stroke[Math.min(stroke.length - 1, i + 2)];

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Se os pontos estão muito próximos, usar lineTo para evitar artefatos de curvatura
    if (distance < 0.5) {
      d.push(`L ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`);
      continue;
    }

    // Tensão reduzida para evitar overshoot
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

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  (
    {
      width,
      height,
      originalImage,
      stencilImage,
      stencilOpacity = 80,
      backgroundImage,
      tool = 'pen',
      brushSize = 2,
      brushColor = '#000000',
      stabilization = 50, // Atualizado para 50% conforme pedido
      streamline = 50,    // Atualizado para 50% conforme pedido
      motionFiltering = 3,
      onStrokeStart,
      onStrokeEnd,
      onStrokesChange,
      className = '',
      disabled = false,
    },
    ref
  ) => {
    // Refs para canvas
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);
    const stencilImageRef = useRef<HTMLImageElement | null>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null); // Legacy
    const drawingBufferRef = useRef<HTMLCanvasElement | null>(null);

    // Estado do desenho
    const [isDrawing, setIsDrawing] = useState(false);
    
    // USAR REF para os pontos atuais: Essencial para performance no iPad
    // Evita 240 re-renderizações por segundo da Apple Pencil
    const currentPointsRef = useRef<Point[]>([]);
    
    // Estado apenas para trigger de renderização de preview (quando necessário)
    const [, forceUpdate] = useState({});
    const rafIdRef = useRef<number | null>(null);

    // Função forceUpdate com throttle via requestAnimationFrame
    const throttledForceUpdate = useCallback(() => {
      // Apple Pencil: ZERO throttle, renderizar IMEDIATAMENTE para máxima fluidez
      if (isUsingStylusRef.current) {
        forceUpdate({});
        return;
      }

      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        forceUpdate({});
        rafIdRef.current = null;
      });
    }, []);

    // Limpar RAF ao desmontar
    useEffect(() => {
      return () => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      };
    }, []);

    // Estado para ferramenta de linha
    const [lineStart, setLineStart] = useState<Point | null>(null);
    const [lineEnd, setLineEnd] = useState<Point | null>(null);

    // Histórico de strokes
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const historyRef = useRef<Stroke[][]>([[]]);
    const historyIndexRef = useRef(0);

    // Escala do canvas (para coordenadas corretas)
    const scaleRef = useRef({ x: 1, y: 1 });

    // Stroke Stabilizer para suavização tipo Procreate
    const stabilizerRef = useRef(new StrokeStabilizer());

    // Velocidade do último movimento (para dynamic thinning)
    const lastVelocityRef = useRef(0);
    const lastPointTimeRef = useRef(0);

    // Detectar tipo de dispositivo uma vez (para configuração inicial)
    const isTouch = isTouchDevice();
    const isIOS = isIOSDevice();

    // Ref para detectar se está usando stylus (caneta) - usando ref para atualização SÍNCRONA
    // Isso é CRÍTICO: useState causava delay que fazia os traços ficarem quadrados
    // porque a configuração de suavização não era aplicada a tempo
    const isUsingStylusRef = useRef(false);

    // Função para atualizar a estabilização sincronamente
    const updateStabilization = useCallback((usingStylus: boolean) => {
      // Base: converter de 0-100 para 0-0.7
      let stabFactor = (stabilization / 100) * 0.7;
      let streamFactor = (streamline / 100) * 0.7;

      // Caneta/Stylus OU dispositivo iOS: aumentar suavização
      if (usingStylus || isIOS) {
        stabFactor = Math.min(0.85, stabFactor * 1.2);
        streamFactor = Math.min(0.85, streamFactor * 1.2);
      }

      stabilizerRef.current.setSmoothing(stabFactor, motionFiltering);
    }, [stabilization, streamline, motionFiltering, isIOS]);

    // Atualizar fator de estabilização quando prop muda
    useEffect(() => {
      updateStabilization(isUsingStylusRef.current);
    }, [updateStabilization]);

    // Opções do perfect-freehand otimizadas para qualidade Procreate
    // Valores MUITO mais altos para touch/iPad/Stylus para eliminar traços "quadrados"
    // IMPORTANTE: Usa a REF (isUsingStylusRef.current) para leitura SÍNCRONA
    const getStrokeOptions = useCallback((isPreview = false) => {
      const baseSize = tool === 'eraser' ? brushSize * 3 : brushSize;
      const usingStylus = isUsingStylusRef.current;

      // Parâmetros estilo Procreate otimizados:
      // - iOS (iPad/iPhone) + qualquer caneta: MÁXIMA suavização
      // - iOS touch (dedo): valores muito altos também (tela sensível)
      // - Touch genérico: valores altos
      // - Mouse/Desktop: valores moderados para maior precisão
      let smoothingValue: number;
      let streamlineValue: number;
      let thinningValue: number;

      // PRIORIZAR CANETA sobre iOS para máxima suavização
      // Canetas capturam ~240 pontos/segundo vs ~60 do dedo
      if (usingStylus) {
        // Caneta: "Technical Pen" - Alta precisão, streamLine alto
        smoothingValue = 0.98;
        streamlineValue = 0.95 + (streamline / 100) * 0.04; // 0.95 - 0.99
        thinningValue = tool === 'eraser' ? 0 : 0.15; // Linha constante mas com leve resposta
      } else if (isIOS) {
        smoothingValue = 0.95;
        streamlineValue = 0.90 + (streamline / 100) * 0.08;
        thinningValue = tool === 'eraser' ? 0 : 0.25;
      } else if (isTouch) {
        smoothingValue = 0.85;
        streamlineValue = 0.80 + (streamline / 100) * 0.10;
        thinningValue = tool === 'eraser' ? 0 : 0.3;
      } else {
        smoothingValue = 0.6;
        streamlineValue = 0.5 + (streamline / 100) * 0.2;
        thinningValue = tool === 'eraser' ? 0 : 0.35;
      }

      return {
        size: baseSize,
        thinning: thinningValue,
        smoothing: smoothingValue,
        streamline: streamlineValue,
        easing: smoothEasing,
        start: {
          cap: true,
          taper: tool === 'eraser' ? 0 : baseSize * 2,
          easing: smoothEasing,
        },
        end: {
          cap: true,
          taper: tool === 'eraser' ? 0 : (isPreview ? 0 : baseSize * 3),
          easing: smoothEasing,
        },
        simulatePressure: false,
        last: !isPreview,
      };
    }, [brushSize, tool, isTouch, isIOS]);

    // Calcular escala quando o container muda de tamanho
    useEffect(() => {
      const updateScale = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Escala = tamanho real do canvas / tamanho visual na tela
        scaleRef.current = {
          x: width / rect.width,
          y: height / rect.height,
        };
      };

      updateScale();

      // Atualizar após o layout completo
      const timeoutId = setTimeout(updateScale, 100);

      // ResizeObserver para detectar mudanças de tamanho
      const resizeObserver = new ResizeObserver(() => {
        updateScale();
      });

      if (canvasRef.current) {
        resizeObserver.observe(canvasRef.current);
      }

      window.addEventListener('resize', updateScale);

      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateScale);
      };
    }, [width, height]);

    // Carregar imagem original (fundo - referência)
    useEffect(() => {
      if (!originalImage) {
        originalImageRef.current = null;
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        originalImageRef.current = img;
        renderCanvas();
      };
      img.src = originalImage;
    }, [originalImage]);

    // Carregar stencil (camada do meio)
    useEffect(() => {
      if (!stencilImage) {
        stencilImageRef.current = null;
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        stencilImageRef.current = img;
        renderCanvas();

        // Atualizar escala após imagem carregar
        requestAnimationFrame(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            scaleRef.current = {
              x: width / rect.width,
              y: height / rect.height,
            };
          }
        });
      };
      img.src = stencilImage;
    }, [stencilImage, width, height]);

    // Legacy: Carregar backgroundImage se não tiver original/stencil separados
    useEffect(() => {
      if (originalImage || stencilImage) {
        bgImageRef.current = null;
        return;
      }

      if (!backgroundImage) {
        bgImageRef.current = null;
        renderCanvas();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        bgImageRef.current = img;
        renderCanvas();
      };
      img.src = backgroundImage;
    }, [backgroundImage, originalImage, stencilImage]);

    const renderCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Suporte a HIGH DPI (Retina) - Forçar ajuste sempre
      const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      
      // Sincronizar tamanho físico e visual
      const targetWidth = width * ratio;
      const targetHeight = height * ratio;
      
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        // Removido style.width/height fixos para evitar o problema de "zoom"
        // O canvas agora se ajustará ao container via CSS (w-full h-full)
      }
      
      // Otimização crucial: desynchronized: true reduz latência no iPad/Safari
      const ctx = canvas.getContext('2d', { 
        alpha: true,
        desynchronized: isIOS // Ativar apenas em iOS onde o jitter é reportado
      });
      if (!ctx) return;

      // RESETAR TRANSFORMAÇÃO E APLICAR ESCALA FÍSICA A CADA RENDER
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Limpar
      ctx.clearRect(0, 0, width, height);

      // ===== CAMADA 1: Fundo branco =====
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ===== CAMADA 2: Imagem Original (referência - 50% opacidade) =====
      if (originalImageRef.current) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(originalImageRef.current, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      // ===== CAMADA 3: Stencil com blend multiply =====
      if (stencilImageRef.current) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = stencilOpacity / 100;
        ctx.drawImage(stencilImageRef.current, 0, 0, width, height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Legacy fallback
      if (!originalImageRef.current && !stencilImageRef.current && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, width, height);
      }

      // ===== CAMADA 4: Strokes salvos (usando buffer p/ suporte a borracha) =====
      if (strokes.length > 0) {
        // Inicializar ou redimensionar buffer se necessário
        if (!drawingBufferRef.current) {
          drawingBufferRef.current = document.createElement('canvas');
        }
        
        const buffer = drawingBufferRef.current;
        if (buffer.width !== targetWidth || buffer.height !== targetHeight) {
          buffer.width = targetWidth;
          buffer.height = targetHeight;
        }

        const bCtx = buffer.getContext('2d');
        if (bCtx) {
          bCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
          bCtx.clearRect(0, 0, width, height);
          bCtx.imageSmoothingEnabled = true;
          bCtx.imageSmoothingQuality = 'high';

          strokes.forEach((s: Stroke) => {
            if (!s.path) return;
            const path = new Path2D(s.path);
            bCtx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
            bCtx.fillStyle = s.tool === 'eraser' ? '#000' : s.color;
            bCtx.fill(path);
          });

          // Desenhar buffer no canvas principal
          ctx.drawImage(buffer, 0, 0, width, height);
        }
      }

      ctx.globalCompositeOperation = 'source-over';

      // ===== CAMADA 5: Preview (Stroke atual) =====
      if (tool === 'line' && lineStart && lineEnd) {
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        const currentPoints = currentPointsRef.current;
        if (currentPoints.length >= 2) {
          // Interpolação para suavidade máxima (Procreate quality)
          let pointsToRender = currentPoints;
          if (currentPoints.length >= 3) {
            const segments = isUsingStylusRef.current ? 12 : (isIOS ? 8 : 4);
            const smoothing = isUsingStylusRef.current ? 10 : (isIOS ? 8 : 4);
            pointsToRender = processPointsForProcreateQuality(currentPoints, {
              interpolationSegments: segments,
              pressureSmoothing: smoothing,
            });
          }

          const inputPoints = pointsToRender.map((p: Point) => [p.x, p.y, p.pressure]);
          const outlinePoints = getStroke(inputPoints, getStrokeOptions(true));

          if (outlinePoints.length > 0) {
            const pathData = getSvgPathFromStroke(outlinePoints);
            const path = new Path2D(pathData);
            ctx.fillStyle = tool === 'eraser' ? 'rgba(255, 100, 100, 0.4)' : brushColor;
            ctx.fill(path);
          }
        }
      }
    }, [strokes, brushColor, tool, stencilOpacity, getStrokeOptions, lineStart, lineEnd, brushSize, isTouch, isIOS, width, height]);

    // Re-renderizar quando strokes ou currentPoints mudam
    useEffect(() => {
      renderCanvas();
    }, [renderCanvas]);

    // Obter coordenadas do canvas a partir do evento com estabilização
    const getCanvasPoint = useCallback((e: React.PointerEvent, useStabilizer = true): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

      // Usar clientX/Y para maior confiabilidade no iOS/Safari (ignora zoom/scroll)
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Aplicar escala do canvas
      let x = clientX * scaleRef.current.x;
      let y = clientY * scaleRef.current.y;

      // Calcular velocidade antes da estabilização
      const now = performance.now();
      const dt = Math.max(1, now - lastPointTimeRef.current);
      lastPointTimeRef.current = now;

      const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
      let velocity = 1;

      if (lastPoint) {
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        velocity = Math.sqrt(dx * dx + dy * dy) / dt;
      }

      // Aplicar stroke stabilizer
      if (useStabilizer) {
        const stabilized = stabilizerRef.current.stabilize(x, y, velocity);
        x = stabilized.x;
        y = stabilized.y;
      }

      // Pressure
      let pressure = e.pressure;
      if (pressure === 0 || pressure === undefined || e.pointerType === 'mouse') {
        const normalizedVelocity = Math.min(velocity / 2, 1);
        pressure = 0.7 - normalizedVelocity * 0.4;
      } else {
        pressure = advancedPressureCurve(pressure);
      }

      return { x, y, pressure: Math.max(0.1, Math.min(1, pressure)) };
    }, []);

    // Handlers de eventos
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      // Detectar se está usando stylus (qualquer caneta: Apple Pencil, S-Pen, caneta genérica, etc)
      // pointerType: 'pen' = stylus/caneta, 'touch' = dedo, 'mouse' = mouse
      // IMPORTANTE: Usar REF para atualização SÍNCRONA (não useState que é assíncrono)
      const usingStylus = e.pointerType === 'pen';
      isUsingStylusRef.current = usingStylus;

      // Atualizar estabilização sincronamente
      updateStabilization(usingStylus);

      // Capturar pointer para receber eventos mesmo fora do elemento
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Resetar stabilizer para novo traço
      stabilizerRef.current.reset();
      lastVelocityRef.current = 0;
      lastPointTimeRef.current = performance.now();

      // Primeiro ponto sem estabilização para resposta imediata
      const point = getCanvasPoint(e, false);

      setIsDrawing(true);
      currentPointsRef.current = [point];

      // Para ferramenta de linha, salvar ponto inicial
      if (tool === 'line') {
        setLineStart(point);
        setLineEnd(point);
      }

      onStrokeStart?.();
    }, [disabled, getCanvasPoint, onStrokeStart, tool, updateStabilization]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
      if (!isDrawing || disabled) return;

      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Para ferramenta de linha, apenas atualizar ponto final
      if (tool === 'line') {
        const point = getCanvasPoint(e, false);
        setLineEnd(point);
        return;
      }

      // Capturar eventos (Coalesced p/ Windows/Android, Predicted p/ iOS)
      const nativeEvent = e.nativeEvent as any;
      const coalescedEvents = nativeEvent.getCoalescedEvents?.() || [nativeEvent];
      const predictedEvents = isIOS ? nativeEvent.getPredictedEvents?.() || [] : [];

      const rect = canvas.getBoundingClientRect();
      const newPoints: Point[] = [];

      coalescedEvents.forEach((evt: PointerEvent) => {
        const clientX = evt.clientX - rect.left;
        const clientY = evt.clientY - rect.top;

        let x = clientX * scaleRef.current.x;
        let y = clientY * scaleRef.current.y;

        const now = performance.now();
        const dt = Math.max(1, now - lastPointTimeRef.current);
        lastPointTimeRef.current = now;

        const lastPoint = newPoints.length > 0
          ? newPoints[newPoints.length - 1]
          : currentPointsRef.current[currentPointsRef.current.length - 1];

        // Calcular velocidade para filtro e estabilização
        let velocity = 1;
        if (lastPoint) {
          const dx = x - lastPoint.x;
          const dy = y - lastPoint.y;
          const rawDistance = Math.sqrt(dx * dx + dy * dy);
          velocity = rawDistance / dt;
          
          // SÓ filtrar minDistance em movimentos RÁPIDOS
          if (velocity > 0.5) {
            const minDist = isUsingStylusRef.current ? 0.1 : 0.2;
            if (rawDistance < minDist) return;
          }
        }

        // Estabilização Adaptativa à velocidade
        const stabilized = stabilizerRef.current.stabilize(x, y, velocity);
        x = stabilized.x;
        y = stabilized.y;

        // Pressure
        let pressure = evt.pressure;
        if (pressure === 0 || pressure === undefined || evt.pointerType === 'mouse') {
          const normalizedVelocity = Math.min(velocity / 2, 1);
          pressure = 0.7 - normalizedVelocity * 0.4;
        } else {
          pressure = advancedPressureCurve(pressure);
        }

        newPoints.push({ x, y, pressure: Math.max(0.1, Math.min(1, pressure)) });
      });

      if (newPoints.length > 0) {
        currentPointsRef.current = [...currentPointsRef.current, ...newPoints];
        throttledForceUpdate();
      }
    }, [isDrawing, disabled, getCanvasPoint, tool, isIOS]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
      if (!isDrawing) return;

      e.preventDefault();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Finalizar linha reta
      if (tool === 'line' && lineStart && lineEnd) {
        // Criar path SVG para linha reta com espessura
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 1) {
          // Normalizar vetor perpendicular
          const nx = -dy / length;
          const ny = dx / length;
          const halfWidth = brushSize / 2;

          // Criar retângulo arredondado para a linha
          const pathData = `
            M ${lineStart.x + nx * halfWidth} ${lineStart.y + ny * halfWidth}
            L ${lineEnd.x + nx * halfWidth} ${lineEnd.y + ny * halfWidth}
            A ${halfWidth} ${halfWidth} 0 0 1 ${lineEnd.x - nx * halfWidth} ${lineEnd.y - ny * halfWidth}
            L ${lineStart.x - nx * halfWidth} ${lineStart.y - ny * halfWidth}
            A ${halfWidth} ${halfWidth} 0 0 1 ${lineStart.x + nx * halfWidth} ${lineStart.y + ny * halfWidth}
            Z
          `.trim();

          const newStroke: Stroke = {
            id: generateStrokeId(),
            points: [lineStart, lineEnd],
            path: pathData,
            color: brushColor,
            size: brushSize,
            tool: 'line',
            timestamp: Date.now(),
          };

          const newStrokes = [...strokes, newStroke];
          setStrokes(newStrokes);

          // Atualizar histórico
          historyRef.current = [
            ...historyRef.current.slice(0, historyIndexRef.current + 1),
            newStrokes,
          ];
          historyIndexRef.current = historyRef.current.length - 1;

          onStrokeEnd?.(newStroke);
          onStrokesChange?.(newStrokes);
        }
      }

      // Resetar estado da linha
      setLineStart(null);
      setLineEnd(null);
      setIsDrawing(false);

      const currentPoints = currentPointsRef.current;
      if (currentPoints.length >= 2) {
        let interpolationSegments: number;
        let pressureSmoothing: number;

        // Calcular velocidade média do traço para interpolação adaptativa
        let totalVelocity = 0;
        for (let i = 1; i < currentPoints.length; i++) {
          const p1 = currentPoints[i - 1];
          const p2 = currentPoints[i];
          const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          totalVelocity += dist;
        }
        const avgVelocity = totalVelocity / Math.max(currentPoints.length, 1);

        // Movimento lento = MENOS interpolação para evitar "pontos fantasma" quadrados
        // Movimento rápido = MAIS interpolação para preencher lacunas
        if (avgVelocity < 0.5) {
          interpolationSegments = isUsingStylusRef.current ? 4 : 2;
          pressureSmoothing = 4;
        } else if (avgVelocity < 2) {
          interpolationSegments = isUsingStylusRef.current ? 12 : 6;
          pressureSmoothing = 8;
        } else {
          interpolationSegments = isUsingStylusRef.current ? 20 : 10;
          pressureSmoothing = 14;
        }

        const processedPoints = processPointsForProcreateQuality(currentPoints, {
          interpolationSegments,
          pressureSmoothing,
        });

        const inputPoints = processedPoints.map((p: Point) => [p.x, p.y, p.pressure]);
        const options = getStrokeOptions(false);

        const outlinePoints = getStroke(inputPoints, options);

        if (outlinePoints.length > 0) {
          const pathData = getSvgPathFromStroke(outlinePoints);

          const newStroke: Stroke = {
            id: generateStrokeId(),
            points: [...currentPoints],
            path: pathData,
            color: tool === 'eraser' ? '#FFFFFF' : brushColor,
            size: brushSize,
            tool,
            timestamp: Date.now(),
          };

          const newStrokes = [...strokes, newStroke];
          setStrokes(newStrokes);

          historyRef.current = [
            ...historyRef.current.slice(0, historyIndexRef.current + 1),
            newStrokes,
          ];
          historyIndexRef.current = historyRef.current.length - 1;

          onStrokeEnd?.(newStroke);
          onStrokesChange?.(newStrokes);
        }
      }

      // Resetar estado
      stabilizerRef.current.reset();
      setIsDrawing(false);
      currentPointsRef.current = [];
    }, [isDrawing, strokes, tool, brushColor, brushSize, getStrokeOptions, onStrokeEnd, onStrokesChange, lineStart, lineEnd, isIOS, isTouch]);

    const handlePointerLeave = useCallback((e: React.PointerEvent) => {
      if (isDrawing) {
        handlePointerUp(e);
      }
    }, [isDrawing, handlePointerUp]);

    // Funções expostas via ref
    const undo = useCallback((): boolean => {
      if (historyIndexRef.current <= 0) return false;

      historyIndexRef.current -= 1;
      const previousStrokes = historyRef.current[historyIndexRef.current];
      setStrokes([...previousStrokes]);
      onStrokesChange?.([...previousStrokes]);

      return true;
    }, [onStrokesChange]);

    const redo = useCallback((): boolean => {
      if (historyIndexRef.current >= historyRef.current.length - 1) return false;

      historyIndexRef.current += 1;
      const nextStrokes = historyRef.current[historyIndexRef.current];
      setStrokes([...nextStrokes]);
      onStrokesChange?.([...nextStrokes]);

      return true;
    }, [onStrokesChange]);

    const clear = useCallback(() => {
      setStrokes([]);
      currentPointsRef.current = [];
      setLineStart(null);
      setLineEnd(null);
      historyRef.current = [[]];
      historyIndexRef.current = 0;
      onStrokesChange?.([]);
    }, [onStrokesChange]);

    const exportAsDataUrl = useCallback((): string => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    }, []);

    /**
     * Exporta apenas o stencil + desenhos do usuário (SEM a imagem original de referência)
     * Isso é o que deve ser salvo/baixado
     */
    const exportStencilOnly = useCallback((): string => {
      const canvas = canvasRef.current;
      if (!canvas) return '';

      // Criar canvas temporário para renderizar apenas stencil + desenhos
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d', { alpha: true });
      if (!ctx) return '';

      // ===== CAMADA 1: Fundo branco =====
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // ===== CAMADA 2: Stencil (SEM a imagem original) =====
      if (stencilImageRef.current) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = stencilOpacity / 100;
        ctx.drawImage(stencilImageRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Legacy: backgroundImage se não tiver camadas separadas
      if (!originalImageRef.current && !stencilImageRef.current && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      }

      // ===== CAMADA 3: Strokes do usuário (em canvas separado para eraser funcionar) =====
      if (strokes.length > 0) {
        const drawingCanvas = document.createElement('canvas');
        drawingCanvas.width = tempCanvas.width;
        drawingCanvas.height = tempCanvas.height;
        const drawCtx = drawingCanvas.getContext('2d', { alpha: true });

        if (drawCtx) {
          strokes.forEach((stroke) => {
            if (!stroke.path) return;

            const path = new Path2D(stroke.path);

            if (stroke.tool === 'eraser') {
              // Borracha: usar destination-out para "recortar" os desenhos
              drawCtx.globalCompositeOperation = 'destination-out';
            } else {
              drawCtx.globalCompositeOperation = 'source-over';
            }

            drawCtx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
            drawCtx.fill(path);
          });

          // Compositar o canvas de desenhos sobre o canvas principal
          ctx.drawImage(drawingCanvas, 0, 0);
        }
      }

      return tempCanvas.toDataURL('image/png');
    }, [strokes, stencilOpacity]);

    // Expor métodos via ref
    useImperativeHandle(ref, () => ({
      undo,
      redo,
      clear,
      getStrokes: () => strokes,
      setStrokes: (newStrokes: Stroke[]) => {
        setStrokes(newStrokes);
        historyRef.current = [[], newStrokes];
        historyIndexRef.current = 1;
      },
      exportAsDataUrl,
      exportStencilOnly, // Novo método para exportar apenas stencil + desenhos
      getCanvas: () => canvasRef.current,
    }), [undo, redo, clear, strokes, exportAsDataUrl, exportStencilOnly]);

    // Atalhos de teclado
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (disabled) return;

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
          e.preventDefault();
          redo();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [disabled, undo, redo]);

    return (
      <div
        ref={containerRef}
        className={`relative ${className}`}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerLeave}
          className={`w-full h-full ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          style={{
            touchAction: 'none',
            cursor: tool === 'eraser' ? 'cell' : tool === 'line' ? 'crosshair' : 'crosshair',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            imageRendering: 'auto', // FORÇAR AUTO P/ ANTI-ALIASING
          }}
        />
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
