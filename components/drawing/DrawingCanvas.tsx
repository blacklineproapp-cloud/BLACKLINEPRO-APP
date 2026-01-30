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
 * Stroke Stabilizer - "Lazy Brush" effect
 * Suaviza tremores da mão mantendo precisão
 */
class StrokeStabilizer {
  private targetX: number = 0;
  private targetY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private initialized: boolean = false;

  // Fator de suavização (0 = sem suavização, 1 = máxima suavização)
  // 0.3-0.5 é ideal para desenho artístico
  private smoothFactor: number = 0.35;

  reset() {
    this.initialized = false;
  }

  setSmoothing(factor: number) {
    this.smoothFactor = Math.max(0, Math.min(1, factor));
  }

  stabilize(x: number, y: number): { x: number; y: number } {
    if (!this.initialized) {
      this.targetX = x;
      this.targetY = y;
      this.currentX = x;
      this.currentY = y;
      this.initialized = true;
      return { x, y };
    }

    this.targetX = x;
    this.targetY = y;

    // Interpolação linear com fator de suavização
    // Quanto maior o smoothFactor, mais "lazy" o brush
    const lerp = 1 - this.smoothFactor;
    this.currentX += (this.targetX - this.currentX) * lerp;
    this.currentY += (this.targetY - this.currentY) * lerp;

    return {
      x: this.currentX,
      y: this.currentY,
    };
  }
}

export interface DrawingCanvasRef {
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  getStrokes: () => Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  exportAsDataUrl: () => string;
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
  onStrokeStart?: () => void;
  onStrokeEnd?: (stroke: Stroke) => void;
  onStrokesChange?: (strokes: Stroke[]) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Converte outline do perfect-freehand para SVG path
 */
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

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
      stabilization = 35, // 35% de estabilização por padrão (bom equilíbrio)
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

    // Estado do desenho
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

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

    // Atualizar fator de estabilização quando prop muda
    useEffect(() => {
      // Converter de 0-100 para 0-0.6 (máximo recomendado para responsividade)
      const factor = (stabilization / 100) * 0.6;
      stabilizerRef.current.setSmoothing(factor);
    }, [stabilization]);

    // Velocidade do último movimento (para dynamic thinning)
    const lastVelocityRef = useRef(0);
    const lastPointTimeRef = useRef(0);

    // Opções do perfect-freehand otimizadas para qualidade Procreate
    const getStrokeOptions = useCallback((isPreview = false) => {
      const baseSize = tool === 'eraser' ? brushSize * 3 : brushSize;

      // Parâmetros estilo Procreate:
      // - smoothing alto (0.7) para traços suaves
      // - streamline alto (0.65) para linhas fluidas
      // - thinning moderado (0.4) para variação natural de espessura
      return {
        size: baseSize,
        thinning: tool === 'eraser' ? 0 : 0.4,
        smoothing: 0.7,    // Aumentado de 0.5 para suavidade Procreate
        streamline: 0.65,  // Aumentado de 0.5 para fluidez
        easing: smoothEasing, // Easing suave ao invés de linear
        start: {
          cap: true,
          taper: tool === 'eraser' ? 0 : baseSize * 2, // Tapering natural no início
          easing: smoothEasing,
        },
        end: {
          cap: true,
          taper: tool === 'eraser' ? 0 : (isPreview ? 0 : baseSize * 3), // Tapering maior no fim
          easing: smoothEasing,
        },
        simulatePressure: false, // Vamos usar nossa própria simulação de pressão
        last: !isPreview,
      };
    }, [brushSize, tool]);

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

    // Renderizar canvas com camadas: Original (fundo) -> Stencil (blend) -> Desenhos
    const renderCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      // Limpar
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ===== CAMADA 1: Fundo branco =====
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ===== CAMADA 2: Imagem Original (referência - 50% opacidade) =====
      if (originalImageRef.current) {
        ctx.globalAlpha = 0.5; // 50% opacidade para ver bem
        ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      // ===== CAMADA 3: Stencil com blend multiply =====
      if (stencilImageRef.current) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = stencilOpacity / 100;
        ctx.drawImage(stencilImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Legacy: backgroundImage se não tiver camadas separadas
      if (!originalImageRef.current && !stencilImageRef.current && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      }

      // ===== CAMADA 4: Strokes do usuário =====
      strokes.forEach((stroke) => {
        if (!stroke.path) return;

        const path = new Path2D(stroke.path);

        if (stroke.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.fillStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
        ctx.fill(path);
      });

      ctx.globalCompositeOperation = 'source-over';

      // ===== CAMADA 5: Stroke atual (preview) =====
      if (tool === 'line' && lineStart && lineEnd) {
        // Preview de linha reta
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else if (currentPoints.length >= 2) {
        // Para preview, não aplicamos interpolação pesada para manter responsividade
        const inputPoints = currentPoints.map(p => [p.x, p.y, p.pressure]);
        const options = getStrokeOptions(true); // isPreview = true (sem tapering final)

        const outlinePoints = getStroke(inputPoints, options);

        if (outlinePoints.length > 0) {
          const pathData = getSvgPathFromStroke(outlinePoints);
          const path = new Path2D(pathData);

          if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = '#FFFFFF';
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = brushColor;
          }

          ctx.fill(path);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }, [strokes, currentPoints, brushColor, tool, stencilOpacity, getStrokeOptions, lineStart, lineEnd, brushSize]);

    // Re-renderizar quando strokes ou currentPoints mudam
    useEffect(() => {
      renderCanvas();
    }, [renderCanvas]);

    // Obter coordenadas do canvas a partir do evento com estabilização
    const getCanvasPoint = useCallback((e: React.PointerEvent, useStabilizer = true): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

      // Usar nativeEvent.offsetX/Y que já está relativo ao elemento
      const offsetX = e.nativeEvent.offsetX;
      const offsetY = e.nativeEvent.offsetY;

      // Aplicar escala para converter de coordenadas visuais para coordenadas do canvas
      let x = offsetX * scaleRef.current.x;
      let y = offsetY * scaleRef.current.y;

      // Aplicar stroke stabilizer para suavizar tremores
      if (useStabilizer) {
        const stabilized = stabilizerRef.current.stabilize(x, y);
        x = stabilized.x;
        y = stabilized.y;
      }

      // Calcular velocidade para simulação de pressão
      const now = performance.now();
      const dt = now - lastPointTimeRef.current;
      lastPointTimeRef.current = now;

      // Pressure: usar valor real se disponível
      let pressure = e.pressure;

      if (pressure === 0 || pressure === undefined || e.pointerType === 'mouse') {
        // Simular pressão baseado na velocidade para mouse/touch sem pressão
        // Movimento lento = mais pressão, movimento rápido = menos pressão
        const dx = x - (stabilizerRef.current as any).targetX || 0;
        const dy = y - (stabilizerRef.current as any).targetY || 0;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = dt > 0 ? distance / dt : 0;

        // Suavizar velocidade para evitar mudanças bruscas
        lastVelocityRef.current = lastVelocityRef.current * 0.7 + velocity * 0.3;

        // Converter velocidade em pressão (velocidade baixa = pressão alta)
        const normalizedVelocity = Math.min(lastVelocityRef.current / 2, 1);
        pressure = 0.7 - normalizedVelocity * 0.4; // Range: 0.3 - 0.7
      } else {
        // Aplicar curva de pressão avançada para stylus/Apple Pencil
        pressure = advancedPressureCurve(pressure);
      }

      return { x, y, pressure: Math.max(0.1, Math.min(1, pressure)) };
    }, []);

    // Handlers de eventos
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      // Capturar pointer para receber eventos mesmo fora do elemento
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Resetar stabilizer para novo traço
      stabilizerRef.current.reset();
      lastVelocityRef.current = 0;
      lastPointTimeRef.current = performance.now();

      // Primeiro ponto sem estabilização para resposta imediata
      const point = getCanvasPoint(e, false);

      setIsDrawing(true);

      // Para ferramenta de linha, salvar ponto inicial
      if (tool === 'line') {
        setLineStart(point);
        setLineEnd(point);
      } else {
        setCurrentPoints([point]);
      }

      onStrokeStart?.();
    }, [disabled, getCanvasPoint, onStrokeStart, tool]);

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

      // Capturar eventos coalesced para máxima precisão (Chrome/Firefox)
      const coalescedEvents = (e.nativeEvent as any).getCoalescedEvents?.();

      if (coalescedEvents && coalescedEvents.length > 0) {
        // Usar eventos coalesced se disponíveis
        const rect = canvas.getBoundingClientRect();
        const newPoints: Point[] = [];

        coalescedEvents.forEach((evt: PointerEvent) => {
          // Para eventos coalesced, precisamos calcular offset manualmente
          const offsetX = evt.clientX - rect.left;
          const offsetY = evt.clientY - rect.top;

          let x = offsetX * scaleRef.current.x;
          let y = offsetY * scaleRef.current.y;

          // Aplicar stabilizer
          const stabilized = stabilizerRef.current.stabilize(x, y);
          x = stabilized.x;
          y = stabilized.y;

          // Calcular velocidade e pressão
          const now = performance.now();
          const dt = now - lastPointTimeRef.current;
          lastPointTimeRef.current = now;

          let pressure = evt.pressure;
          if (pressure === 0 || pressure === undefined || evt.pointerType === 'mouse') {
            // Simular pressão baseado na velocidade
            const prevPoint = newPoints.length > 0
              ? newPoints[newPoints.length - 1]
              : currentPoints[currentPoints.length - 1];

            if (prevPoint) {
              const dx = x - prevPoint.x;
              const dy = y - prevPoint.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const velocity = dt > 0 ? distance / dt : 0;

              lastVelocityRef.current = lastVelocityRef.current * 0.7 + velocity * 0.3;
              const normalizedVelocity = Math.min(lastVelocityRef.current / 2, 1);
              pressure = 0.7 - normalizedVelocity * 0.4;
            } else {
              pressure = 0.5;
            }
          } else {
            pressure = advancedPressureCurve(pressure);
          }

          newPoints.push({
            x,
            y,
            pressure: Math.max(0.1, Math.min(1, pressure)),
          });
        });

        setCurrentPoints(prev => [...prev, ...newPoints]);
      } else {
        // Fallback: usar evento principal
        const point = getCanvasPoint(e);
        setCurrentPoints(prev => [...prev, point]);
      }
    }, [isDrawing, disabled, getCanvasPoint, currentPoints, tool]);

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

        // Resetar estado da linha
        setLineStart(null);
        setLineEnd(null);
        setIsDrawing(false);
        return;
      }

      // Finalizar stroke se tiver pontos suficientes
      if (currentPoints.length >= 2) {
        // Aplicar processamento completo estilo Procreate:
        // 1. Suavização de pressão
        // 2. Interpolação Catmull-Rom
        const processedPoints = processPointsForProcreateQuality(currentPoints, {
          interpolationSegments: 2,
          pressureSmoothing: 3,
        });

        const inputPoints = processedPoints.map(p => [p.x, p.y, p.pressure]);
        const options = getStrokeOptions(false); // isPreview = false para tapering final

        const outlinePoints = getStroke(inputPoints, options);

        if (outlinePoints.length > 0) {
          const pathData = getSvgPathFromStroke(outlinePoints);

          const newStroke: Stroke = {
            id: generateStrokeId(),
            points: currentPoints, // Manter pontos originais para histórico
            path: pathData,
            color: tool === 'eraser' ? '#FFFFFF' : brushColor,
            size: brushSize,
            tool,
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

      // Resetar estado
      stabilizerRef.current.reset();
      setIsDrawing(false);
      setCurrentPoints([]);
    }, [isDrawing, currentPoints, strokes, tool, brushColor, brushSize, getStrokeOptions, onStrokeEnd, onStrokesChange, lineStart, lineEnd]);

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
      setCurrentPoints([]);
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
      getCanvas: () => canvasRef.current,
    }), [undo, redo, clear, strokes, exportAsDataUrl]);

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
          }}
        />
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
