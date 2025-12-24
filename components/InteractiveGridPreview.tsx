'use client';

import { useRef, useEffect, useState } from 'react';
import { Move } from 'lucide-react';

interface InteractiveGridPreviewProps {
  imageUrl: string;
  tattooWidthCm: number;
  tattooHeightCm: number;
  paperWidthCm: number;
  paperHeightCm: number;
  overlapCm: number;
  onPositionChange: (x: number, y: number) => void;
  initialX?: number;
  initialY?: number;
  forcedCols?: number; // Grid fixo do frontend
  forcedRows?: number; // Grid fixo do frontend
}

export default function InteractiveGridPreview({
  imageUrl,
  tattooWidthCm,
  tattooHeightCm,
  paperWidthCm,
  paperHeightCm,
  overlapCm,
  onPositionChange,
  initialX = 0,
  initialY = 0,
  forcedCols,
  forcedRows
}: InteractiveGridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(initialX);
  const [offsetY, setOffsetY] = useState(initialY);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [gridInfo, setGridInfo] = useState({ cols: 0, rows: 0 });

  const dragStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });

  // Constants (mesmo DPI da API para cálculo)
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 400;
  const DPI = 100; // Preview
  const CM_TO_PX = DPI / 2.54;

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageObj(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // Sync with external offset changes
  useEffect(() => {
    setOffsetX(initialX);
    setOffsetY(initialY);
  }, [initialX, initialY]);

  // Draw canvas - IGUAL À API
  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ==========================================================================
    // MESMO SISTEMA DA API: Grid começa em (0,0), imagem em (offsetX, offsetY)
    // ==========================================================================

    // Paper dimensions (preview scale)
    const paperWidthPx = paperWidthCm * CM_TO_PX;
    const paperHeightPx = paperHeightCm * CM_TO_PX;
    const overlapPx = overlapCm * CM_TO_PX;
    const effectiveWidthPx = paperWidthPx - overlapPx;
    const effectiveHeightPx = paperHeightPx - overlapPx;

    // Image size - USAR TAMANHO EXATO (IGUAL À API)
    const finalWidthCm = tattooWidthCm;
    const finalHeightCm = tattooHeightCm;

    // Converter para pixels (preview)
    const imageWidthPx = finalWidthCm * CM_TO_PX;
    const imageHeightPx = finalHeightCm * CM_TO_PX;

    // Offset em pixels
    const offsetXPx = offsetX * CM_TO_PX;
    const offsetYPx = offsetY * CM_TO_PX;

    // Usar grid FIXO se fornecido, senão calcular dinamicamente
    let cols: number;
    let rows: number;

    if (forcedCols !== undefined && forcedRows !== undefined) {
      // Grid FIXO do frontend (seleção do usuário: 1, 2, 4, 6, 8 A4s)
      cols = forcedCols;
      rows = forcedRows;
    } else {
      // Calcular dinamicamente (modo legacy)
      const totalWidthPx = offsetXPx + imageWidthPx;
      const totalHeightPx = offsetYPx + imageHeightPx;
      cols = Math.ceil(totalWidthPx / effectiveWidthPx);
      rows = Math.ceil(totalHeightPx / effectiveHeightPx);
    }

    setGridInfo({ cols, rows });

    // ==========================================================================
    // VIEWPORT: Escalar tudo para caber no canvas mantendo proporção
    // ==========================================================================

    const gridTotalWidth = (cols - 1) * effectiveWidthPx + paperWidthPx;
    const gridTotalHeight = (rows - 1) * effectiveHeightPx + paperHeightPx;

    const scale = Math.min(
      (CANVAS_WIDTH * 0.95) / gridTotalWidth,
      (CANVAS_HEIGHT * 0.95) / gridTotalHeight,
      1
    );

    // Centralizar viewport no canvas
    const viewportOffsetX = (CANVAS_WIDTH - gridTotalWidth * scale) / 2;
    const viewportOffsetY = (CANVAS_HEIGHT - gridTotalHeight * scale) / 2;

    // Converter coordenadas globais para canvas
    const toCanvasX = (globalX: number) => viewportOffsetX + globalX * scale;
    const toCanvasY = (globalY: number) => viewportOffsetY + globalY * scale;

    // ==========================================================================
    // DESENHAR IMAGEM (na posição offsetX, offsetY do espaço global)
    // ==========================================================================

    const imgX = toCanvasX(offsetXPx);
    const imgY = toCanvasY(offsetYPx);
    const imgW = imageWidthPx * scale;
    const imgH = imageHeightPx * scale;

    ctx.drawImage(imageObj, imgX, imgY, imgW, imgH);

    // ==========================================================================
    // DESENHAR GRID (começando em 0,0 do espaço global)
    // ==========================================================================

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    let pageNum = 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Posição no espaço global (IGUAL À API)
        const pageGlobalLeft = col * effectiveWidthPx;
        const pageGlobalTop = row * effectiveHeightPx;

        // Converter para canvas
        const x = toCanvasX(pageGlobalLeft);
        const y = toCanvasY(pageGlobalTop);
        const w = paperWidthPx * scale;
        const h = paperHeightPx * scale;

        // Paper boundary
        ctx.strokeRect(x, y, w, h);

        // Overlap area (pink)
        if (overlapCm > 0) {
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          const overlapScaled = overlapPx * scale;
          ctx.strokeRect(x, y, w - overlapScaled, h - overlapScaled);
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
        }

        // Page number
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`#${pageNum}`, x + 8, y + 22);
        pageNum++;
      }
    }

    ctx.setLineDash([]);
  }, [imageObj, offsetX, offsetY, tattooWidthCm, tattooHeightCm, paperWidthCm, paperHeightCm, overlapCm, forcedCols, forcedRows]);

  // ==========================================================================
  // DRAG: Mover a imagem (aumentar/diminuir offset)
  // ==========================================================================

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX - rect.left,
      mouseY: e.clientY - rect.top,
      offsetX,
      offsetY
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageObj || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentMouseX = e.clientX - rect.left;
    const currentMouseY = e.clientY - rect.top;

    const deltaX = currentMouseX - dragStart.current.mouseX;
    const deltaY = currentMouseY - dragStart.current.mouseY;

    // Calcular tamanho final da imagem (tamanho exato)
    const finalWidthCm = tattooWidthCm;
    const finalHeightCm = tattooHeightCm;
    const imageWidthPx = finalWidthCm * CM_TO_PX;
    const imageHeightPx = finalHeightCm * CM_TO_PX;

    // Calcular scale atual
    const paperWidthPx = paperWidthCm * CM_TO_PX;
    const paperHeightPx = paperHeightCm * CM_TO_PX;
    const overlapPx = overlapCm * CM_TO_PX;
    const effectiveWidthPx = paperWidthPx - overlapPx;
    const effectiveHeightPx = paperHeightPx - overlapPx;

    const offsetXPx = dragStart.current.offsetX * CM_TO_PX;
    const offsetYPx = dragStart.current.offsetY * CM_TO_PX;

    // Usar grid FIXO se fornecido
    let cols: number;
    let rows: number;

    if (forcedCols !== undefined && forcedRows !== undefined) {
      cols = forcedCols;
      rows = forcedRows;
    } else {
      const totalWidthPx = offsetXPx + imageWidthPx;
      const totalHeightPx = offsetYPx + imageHeightPx;
      cols = Math.ceil(totalWidthPx / effectiveWidthPx);
      rows = Math.ceil(totalHeightPx / effectiveHeightPx);
    }

    const gridTotalWidth = (cols - 1) * effectiveWidthPx + paperWidthPx;
    const gridTotalHeight = (rows - 1) * effectiveHeightPx + paperHeightPx;

    const scale = Math.min(
      (CANVAS_WIDTH * 0.95) / gridTotalWidth,
      (CANVAS_HEIGHT * 0.95) / gridTotalHeight,
      1
    );

    // Converter delta de pixels canvas para cm
    const deltaXCm = deltaX / scale / CM_TO_PX;
    const deltaYCm = deltaY / scale / CM_TO_PX;

    // Arrastar para DIREITA = AUMENTAR offset (imagem se move para direita)
    const newOffsetX = Math.max(0, dragStart.current.offsetX + deltaXCm);
    const newOffsetY = Math.max(0, dragStart.current.offsetY + deltaYCm);

    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
    onPositionChange(newOffsetX, newOffsetY);
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Move size={14} className="text-purple-500" />
          <span>Arraste a imagem</span>
        </div>
        <div className="bg-purple-900/20 px-2 py-1 rounded text-purple-300 font-medium">
          {gridInfo.cols}×{gridInfo.rows} = {gridInfo.cols * gridInfo.rows} folhas
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={`w-full bg-zinc-950 rounded-lg border-2 transition-colors ${
          isDragging ? 'border-purple-500 cursor-grabbing' : 'border-zinc-800 cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className="flex gap-2">
        <button
          onClick={() => {
            setOffsetX(0);
            setOffsetY(0);
            onPositionChange(0, 0);
          }}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs py-2 rounded transition-colors"
        >
          Resetar
        </button>
        <button
          onClick={() => {
            // Centralizar imagem na primeira página
            if (!imageObj) return;

            // Tamanho exato da imagem
            const imageWidthPx = tattooWidthCm * CM_TO_PX;
            const imageHeightPx = tattooHeightCm * CM_TO_PX;

            const paperWidthPx = paperWidthCm * CM_TO_PX;
            const paperHeightPx = paperHeightCm * CM_TO_PX;

            const centerX = Math.max(0, (paperWidthPx - imageWidthPx) / 2 / CM_TO_PX);
            const centerY = Math.max(0, (paperHeightPx - imageHeightPx) / 2 / CM_TO_PX);

            setOffsetX(centerX);
            setOffsetY(centerY);
            onPositionChange(centerX, centerY);
          }}
          className="flex-1 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 text-xs py-2 rounded transition-colors"
        >
          Centralizar
        </button>
      </div>
    </div>
  );
}
