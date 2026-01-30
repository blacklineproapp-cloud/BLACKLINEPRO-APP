# Ferramenta de Desenho - Pesquisa Técnica Completa

## Objetivo
Implementar uma ferramenta de desenho no StencilFlow com precisão similar ao **Procreate**, especialmente otimizada para iPad/tablet com Apple Pencil.

---

## 1. Como o Procreate Funciona

### Algoritmos de Suavização

O Procreate usa **3 técnicas principais** para criar traços suaves:

| Técnica | Como Funciona | Quando Usar |
|---------|---------------|-------------|
| **Stabilization** | Calcula média móvel dos pontos do traço. Quanto maior, mais suave. Depende da velocidade. | Linhas gerais, sketch |
| **Motion Filtering** | Remove extremidades dos "tremores" completamente (não faz média). Não depende da velocidade. | Linhas retas, técnicas |
| **StreamLine** | Suaviza wobbles em tempo real enquanto desenha. | Inking, caligrafia |

### Motion Filtering Expression
Depois de suavizar, o Procreate adiciona uma "expressão" de volta para não ficar artificial demais. Ignora pequenas flutuações mas mantém o fluxo natural.

---

## 2. Arquitetura Recomendada para Web

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE ENTRADA                     │
├─────────────────────────────────────────────────────────┤
│  Pointer Events API                                      │
│  - pointerdown, pointermove, pointerup                   │
│  - pressure, tiltX, tiltY, twist (Apple Pencil)          │
│  - getCoalescedEvents() para 240Hz (Chrome)              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  CAMADA DE PROCESSAMENTO                 │
├─────────────────────────────────────────────────────────┤
│  1. Input Buffer (armazena pontos)                       │
│  2. Noise Filtering (remove ruído)                       │
│  3. Interpolation (Catmull-Rom / Bezier)                 │
│  4. Stroke Generation (perfect-freehand)                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   CAMADA DE RENDERIZAÇÃO                 │
├─────────────────────────────────────────────────────────┤
│  Canvas 2D (para 2D simples)                             │
│  - desynchronized: true (baixa latência)                 │
│  - Path2D para desenhar SVG paths                        │
│  OU                                                      │
│  WebGL (para efeitos avançados, >10k elementos)          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Biblioteca Principal: perfect-freehand

### Por que usar?
- Usada pelo **Canva**, **TLDraw**, e outros apps profissionais
- Gera traços com pressure-sensitivity
- Altamente configurável
- 15KB minificado

### Instalação
```bash
npm install perfect-freehand
```

### Uso Básico
```typescript
import { getStroke } from 'perfect-freehand';

// Pontos capturados: [x, y, pressure]
const points = [
  [100, 100, 0.5],
  [110, 102, 0.6],
  [120, 105, 0.7],
  // ...
];

// Gerar o outline do traço
const outlinePoints = getStroke(points, {
  size: 8,              // Diâmetro base
  thinning: 0.5,        // Efeito da pressão na espessura
  smoothing: 0.5,       // Suavidade das bordas
  streamline: 0.5,      // Suavização do caminho
  simulatePressure: false, // FALSE se tiver Apple Pencil
  last: true,           // Traço finalizado
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
});
```

### Renderizar no Canvas
```typescript
function getSvgPathFromStroke(stroke: number[][]) {
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

// Usar no Canvas
const ctx = canvas.getContext('2d', { desynchronized: true });
const path = new Path2D(getSvgPathFromStroke(outlinePoints));
ctx.fill(path);
```

---

## 4. Captura de Pressure Sensitivity

### Pointer Events API (Padrão W3C)

```typescript
canvas.addEventListener('pointermove', (e: PointerEvent) => {
  const point = {
    x: e.clientX,
    y: e.clientY,
    pressure: e.pressure,      // 0.0 - 1.0
    tiltX: e.tiltX,            // -90 a 90 graus
    tiltY: e.tiltY,            // -90 a 90 graus
    twist: e.twist,            // 0 a 359 graus (rotação)
    pointerType: e.pointerType // "pen", "touch", "mouse"
  };

  // Capturar eventos intermediários (Chrome/Firefox)
  const coalescedEvents = e.getCoalescedEvents?.() || [e];

  coalescedEvents.forEach(ce => {
    points.push([ce.clientX, ce.clientY, ce.pressure]);
  });
});
```

### Suporte por Navegador

| Navegador | pressure | tilt | getCoalescedEvents | 240Hz |
|-----------|----------|------|-------------------|-------|
| Chrome/Edge | ✅ | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ | ✅ |
| Safari (iPad) | ✅ | ✅ | ❌ | ✅* |

*Safari não suporta getCoalescedEvents, mas entrega eventos a 240Hz naturalmente no iPad Pro.

### Fallback para Pressure.js
```typescript
import Pressure from 'pressure';

Pressure.set('#canvas', {
  change: (force, event) => {
    // force: 0.0 - 1.0
    currentPressure = force;
  },
  unsupported: () => {
    // Simular pressão pela velocidade
    simulatePressure = true;
  }
});
```

---

## 5. Redução de Latência

### Problema
- Latência típica: 65-120ms (inaceitável para desenho profissional)
- Objetivo: <20ms (imperceptível)

### Soluções

#### 5.1 Canvas Desynchronized
```typescript
const ctx = canvas.getContext('2d', {
  desynchronized: true,  // Renderiza fora do event loop principal
  alpha: false           // Melhor performance se não precisa transparência
});
```

#### 5.2 RequestAnimationFrame com Buffer
```typescript
let pendingPoints: Point[] = [];
let rafId: number;

function handlePointerMove(e: PointerEvent) {
  // Apenas armazena, não processa
  pendingPoints.push({
    x: e.clientX,
    y: e.clientY,
    pressure: e.pressure
  });

  // Agenda renderização
  if (!rafId) {
    rafId = requestAnimationFrame(render);
  }
}

function render() {
  rafId = 0;

  // Processar todos os pontos pendentes
  processPoints(pendingPoints);
  pendingPoints = [];

  // Renderizar stroke atualizado
  drawStroke();
}
```

#### 5.3 Ink Prediction (Avançado)
Usado por Microsoft, Google, e Apple para compensar latência:

```typescript
// Algoritmo simplificado de predição baseado em velocidade
function predictNextPoint(points: Point[]): Point {
  if (points.length < 2) return points[points.length - 1];

  const p1 = points[points.length - 2];
  const p2 = points[points.length - 1];

  // Calcular velocidade
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;

  // Predizer próximo ponto (30ms à frente)
  const predictionMs = 30;
  const dt = 16.67; // 60fps
  const factor = predictionMs / dt;

  return {
    x: p2.x + vx * factor,
    y: p2.y + vy * factor,
    pressure: p2.pressure
  };
}
```

---

## 6. Otimizações de Performance

### 6.1 Segmentação de Strokes (Canva)
Dividir traços longos em segmentos para evitar reprocessamento:

```typescript
const MAX_POINTS_PER_SEGMENT = 100;

function addPoint(point: Point) {
  currentSegment.push(point);

  if (currentSegment.length >= MAX_POINTS_PER_SEGMENT) {
    // Finalizar segmento atual
    segments.push(currentSegment);
    // Começar novo segmento com overlap
    currentSegment = currentSegment.slice(-5);
  }
}
```

### 6.2 Simplificação de Path (Ramer-Douglas-Peucker)
Reduzir número de pontos mantendo a forma:

```typescript
import simplify from 'simplify-js';

// Simplifica preservando curvas
const simplified = simplify(points, tolerance, highQuality);
```

### 6.3 Off-screen Canvas para Strokes Completos
```typescript
// Strokes finalizados vão para canvas off-screen
const offscreenCanvas = new OffscreenCanvas(width, height);
const offscreenCtx = offscreenCanvas.getContext('2d');

function commitStroke(stroke: Stroke) {
  // Desenhar no off-screen (não afeta main thread)
  offscreenCtx.fill(new Path2D(stroke.path));

  // Compositar no canvas principal
  mainCtx.drawImage(offscreenCanvas, 0, 0);
}
```

---

## 7. Configurações de Brush para Stencil

Para o caso de uso do StencilFlow (adicionar linhas ao stencil):

```typescript
const STENCIL_BRUSH_PRESETS = {
  // Linha fina para detalhes
  detail: {
    size: 2,
    thinning: 0.3,
    smoothing: 0.7,
    streamline: 0.6,
    color: '#000000'
  },

  // Linha média para contornos
  outline: {
    size: 4,
    thinning: 0.4,
    smoothing: 0.5,
    streamline: 0.5,
    color: '#000000'
  },

  // Linha grossa para preenchimento
  fill: {
    size: 8,
    thinning: 0.2,
    smoothing: 0.4,
    streamline: 0.4,
    color: '#000000'
  },

  // Borracha
  eraser: {
    size: 10,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    color: '#FFFFFF',
    compositeOperation: 'destination-out'
  }
};
```

---

## 8. Implementação: Componente React

```tsx
// components/drawing/DrawingCanvas.tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getStroke } from 'perfect-freehand';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface DrawingCanvasProps {
  backgroundImage: string;
  onStrokeComplete: (svgPath: string) => void;
  brushSize?: number;
  brushColor?: string;
}

export function DrawingCanvas({
  backgroundImage,
  onStrokeComplete,
  brushSize = 4,
  brushColor = '#000000'
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);

  // Configurações do brush
  const brushOptions = {
    size: brushSize,
    thinning: 0.4,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
    last: true,
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setPoints([{
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
      pressure: e.pressure
    }]);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;

    // Capturar eventos coalesced para máxima precisão
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];

    const newPoints = events.map(evt => ({
      x: evt.offsetX,
      y: evt.offsetY,
      pressure: evt.pressure
    }));

    setPoints(prev => [...prev, ...newPoints]);
  }, [isDrawing]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || points.length < 2) {
      setIsDrawing(false);
      setPoints([]);
      return;
    }

    // Gerar stroke final
    const strokePoints = points.map(p => [p.x, p.y, p.pressure]);
    const outline = getStroke(strokePoints, brushOptions);
    const pathData = getSvgPathFromStroke(outline);

    onStrokeComplete(pathData);

    setIsDrawing(false);
    setPoints([]);
  }, [isDrawing, points, brushOptions, onStrokeComplete]);

  // Renderizar preview do stroke atual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    // Limpar e redesenhar background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar stroke atual
    const strokePoints = points.map(p => [p.x, p.y, p.pressure]);
    const outline = getStroke(strokePoints, { ...brushOptions, last: false });

    if (outline.length > 0) {
      const path = new Path2D(getSvgPathFromStroke(outline));
      ctx.fillStyle = brushColor;
      ctx.fill(path);
    }
  }, [points, brushColor, brushOptions]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        touchAction: 'none', // Importante para iPad
        cursor: 'crosshair'
      }}
    />
  );
}

// Helper para converter outline em SVG path
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
```

---

## 9. Integração com IA (Finalizar Traços)

Após o usuário desenhar, enviar para IA refinar:

```typescript
async function refineWithAI(
  baseStencil: string,      // Stencil original
  userDrawings: string[],   // SVG paths desenhados
  style: 'topografico' | 'linhas' | 'anime'
): Promise<string> {
  // Combinar stencil base com desenhos do usuário
  const combinedImage = await mergeStencilWithDrawings(baseStencil, userDrawings);

  // Enviar para API de refinamento
  const response = await fetch('/api/stencil/refine', {
    method: 'POST',
    body: JSON.stringify({
      image: combinedImage,
      style,
      prompt: 'Refine os traços manuais para ficarem consistentes com o estilo do stencil'
    })
  });

  return (await response.json()).refinedImage;
}
```

---

## 10. Resumo de Implementação

### Fase 1: MVP (1-2 semanas)
- [ ] Canvas de desenho básico com perfect-freehand
- [ ] Suporte a pressure sensitivity (Pointer Events)
- [ ] 3 tamanhos de brush (fino, médio, grosso)
- [ ] Borracha
- [ ] Undo/Redo
- [ ] Salvar como PNG

### Fase 2: Otimização (1 semana)
- [ ] Redução de latência (desynchronized canvas)
- [ ] Segmentação de strokes longos
- [ ] Off-screen canvas para performance
- [ ] Touch slop detection

### Fase 3: Features Avançadas (2 semanas)
- [ ] Ink prediction
- [ ] Integração com IA para refinamento
- [ ] Mais ferramentas (linha reta, formas)
- [ ] Presets de brush salvos
- [ ] Layers (camadas)

---

## Fontes

1. [Procreate Handbook - Brush Studio Settings](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings)
2. [Procreate Stroke Stabilization](https://beebom.com/how-draw-smooth-lines-stroke-stabilization-procreate/)
3. [perfect-freehand GitHub](https://github.com/steveruizok/perfect-freehand)
4. [Canva Engineering - Behind the Draw](https://www.canva.dev/blog/engineering/behind-the-draw/)
5. [MDN - Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
6. [Pressure.js](https://pressurejs.com/)
7. [Apple Developer - Minimizing Latency](https://developer.apple.com/documentation/uikit/touches_presses_and_gestures/handling_touches_in_your_view/minimizing_latency_with_predicted_touches)
8. [ChromeOS Low-Latency Stylus](https://github.com/chromeos/low-latency-stylus)
9. [WebGL vs Canvas Performance](https://semisignal.com/a-look-at-2d-vs-webgl-canvas-performance/)
10. [Cardinal Spline JS](https://github.com/gdenisov/cardinal-spline-js)
