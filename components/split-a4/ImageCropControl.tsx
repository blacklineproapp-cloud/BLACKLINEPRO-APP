'use client';

import { useState, useCallback, useEffect, memo, useMemo } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { RotateCcw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface ImageCropControlProps {
  imageUrl: string;
  paperWidthCm: number;
  paperHeightCm: number;
  cols: number;
  rows: number;
  overlapCm?: number; // ✅ NOVO: Mostrar overlap no preview
  onCropComplete: (croppedAreaPixels: Area, rotation: number, flip: { horizontal: boolean; vertical: boolean }) => void;
}

function ImageCropControl({
  imageUrl,
  paperWidthCm,
  paperHeightCm,
  cols,
  rows,
  overlapCm = 0, // ✅ Extrair overlapCm das props
  onCropComplete
}: ImageCropControlProps) {
  // Estados do cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // ✅ OTIMIZADO: Memoizar cálculo de aspect ratio e dimensões com overlap
  const { gridWidth, gridHeight, aspect, effectiveWidth, effectiveHeight } = useMemo(() => {
    // Largura/altura total do grid INCLUINDO overlap
    const width = cols * paperWidthCm - (cols - 1) * overlapCm;
    const height = rows * paperHeightCm - (rows - 1) * overlapCm;

    // Dimensões efetivas de cada célula (sem overlap)
    const effW = paperWidthCm - overlapCm;
    const effH = paperHeightCm - overlapCm;

    return {
      gridWidth: width,
      gridHeight: height,
      aspect: width / height,
      effectiveWidth: effW,
      effectiveHeight: effH,
    };
  }, [cols, rows, paperWidthCm, paperHeightCm, overlapCm]);

  // Auto-fit inicial quando a imagem carrega
  useEffect(() => {
    // Reset para centralizado quando muda configuração
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
  }, [cols, rows, imageUrl]);

  // ✅ OTIMIZADO: Memoizar handler de centralização
  const handleCenter = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  // Callback quando crop muda
  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
      onCropComplete(croppedAreaPixels, rotation, { horizontal: flipHorizontal, vertical: flipVertical });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rotation, flipHorizontal, flipVertical]
  );

  // Atualizar quando rotation ou flip mudam
  useEffect(() => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels, rotation, { horizontal: flipHorizontal, vertical: flipVertical });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, flipHorizontal, flipVertical, croppedAreaPixels]);

  // ✅ OTIMIZADO: Memoizar todos os handlers
  // ✅ OTIMIZADO: Memoizar todos os handlers
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.1, 10)), []);
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.1, 0.1)), []); // ✅ CORRIGIDO: min 0.1
  const handleZoomReset = useCallback(() => setZoom(1), []);
  const handleRotationReset = useCallback(() => setRotation(0), []);
  const handleFlipH = useCallback(() => setFlipHorizontal(prev => !prev), []);
  const handleFlipV = useCallback(() => setFlipVertical(prev => !prev), []);
  const handleResetAll = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
  }, []);

  return (
    <div className="space-y-3">
      {/* Cropper Area */}
      <div className="relative w-full h-[500px] bg-zinc-950 rounded-lg border-2 border-zinc-800 overflow-hidden">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropCompleteCallback}
          objectFit="horizontal-cover"
          restrictPosition={false}
          showGrid={false}
          zoomWithScroll={true}
          minZoom={0.1}
          maxZoom={10}
          style={{
            containerStyle: {
              background: '#18181b',
            },
            cropAreaStyle: {
              border: '2px dashed #a855f7',
              color: 'rgba(168, 85, 247, 0.1)',
            },
          }}
          transform={`translate(${crop.x}px, ${crop.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`}
        />

        {/* Grid Overlay - mostra divisões dos A4s com overlap e números */}
        {/* 🔧 APRIMORADO: Mostra áreas de overlap visualmente */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="relative bg-transparent border-2 border-indigo-500/30 rounded-lg"
            style={{
              // Manter aspect ratio EXATO do grid
              aspectRatio: `${gridWidth} / ${gridHeight}`,
              // Preencher máximo possível mantendo proporção
              width: aspect > 1 ? '85%' : 'auto',
              height: aspect > 1 ? 'auto' : '85%',
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          >
            {/* Renderizar cada folha A4 individualmente com overlap */}
            {Array.from({ length: rows }).map((_, row) =>
              Array.from({ length: cols }).map((_, col) => {
                const pageNum = row * cols + col + 1;

                // Calcular posição e tamanho de cada folha (em % do grid total)
                const left = (col * (paperWidthCm - overlapCm) / gridWidth) * 100;
                const top = (row * (paperHeightCm - overlapCm) / gridHeight) * 100;
                const width = (paperWidthCm / gridWidth) * 100;
                const height = (paperHeightCm / gridHeight) * 100;

                return (
                  <div
                    key={`page-${row}-${col}`}
                    className="absolute border-2 border-indigo-500/70"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      background: 'rgba(168, 85, 247, 0.05)',
                    }}
                  >
                    {/* Número da página centralizado */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-indigo-600/90 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-indigo-400/50">
                        {pageNum}
                      </div>
                    </div>

                    {/* Área de overlap à direita (se não for última coluna) */}
                    {overlapCm > 0 && col < cols - 1 && (
                      <div
                        className="absolute top-0 bottom-0 bg-amber-500/20 border-l-2 border-dashed border-amber-400/60"
                        style={{
                          right: 0,
                          width: `${(overlapCm / paperWidthCm) * 100}%`,
                        }}
                      />
                    )}

                    {/* Área de overlap abaixo (se não for última linha) */}
                    {overlapCm > 0 && row < rows - 1 && (
                      <div
                        className="absolute left-0 right-0 bg-amber-500/20 border-t-2 border-dashed border-amber-400/60"
                        style={{
                          bottom: 0,
                          height: `${(overlapCm / paperHeightCm) * 100}%`,
                        }}
                      />
                    )}

                    {/* Área de overlap no canto (se houver overlap nas duas direções) */}
                    {overlapCm > 0 && col < cols - 1 && row < rows - 1 && (
                      <div
                        className="absolute bg-amber-500/30"
                        style={{
                          right: 0,
                          bottom: 0,
                          width: `${(overlapCm / paperWidthCm) * 100}%`,
                          height: `${(overlapCm / paperHeightCm) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Controles */}
      <div className="space-y-3">
        {/* ZOOM + ROTAÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* ZOOM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 font-medium">Zoom</label>
              <span className="text-xs text-indigo-400 font-mono">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors disabled:opacity-30"
                disabled={zoom <= 0.1}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <button
                onClick={handleZoomIn}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors disabled:opacity-30"
                disabled={zoom >= 10}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                title="Reset Zoom"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* ROTAÇÃO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 font-medium">Rotação</label>
              <span className="text-xs text-indigo-400 font-mono">{rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRotation(prev => prev - 90)}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                title="Rodar -90°"
              >
                <RotateCcw size={16} />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <button
                onClick={() => setRotation(prev => prev + 90)}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                title="Rodar +90°"
              >
                <RotateCcw size={16} className="transform scale-x-[-1]" />
              </button>
              <button
                onClick={handleRotationReset}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                title="Reset Rotação"
              >
                0°
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FLIP + AÇÕES */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleFlipH}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all ${
            flipHorizontal
              ? 'bg-blue-900/20 border-blue-500 text-blue-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
          }`}
        >
          <FlipHorizontal size={16} />
          <span className="text-xs font-medium">Flip H</span>
        </button>
        <button
          onClick={handleFlipV}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all ${
            flipVertical
              ? 'bg-blue-900/20 border-blue-500 text-blue-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
          }`}
        >
          <FlipVertical size={16} />
          <span className="text-xs font-medium">Flip V</span>
        </button>
        <button
          onClick={handleCenter}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 bg-indigo-900/20 border-indigo-700 text-indigo-400 hover:bg-indigo-900/30 hover:border-indigo-600 transition-all"
        >
          <Maximize2 size={16} />
          <span className="text-xs font-medium">Centralizar</span>
        </button>
        <button
          onClick={handleResetAll}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 transition-all"
        >
          <RotateCcw size={16} />
          <span className="text-xs font-medium">Resetar Tudo</span>
        </button>
      </div>

      {/* Dica de uso */}
      <div className="bg-indigo-900/10 border border-indigo-800/30 rounded-lg p-3">
        <p className="text-xs text-indigo-300/70">
          <strong className="text-indigo-400">💡 Manipule a imagem:</strong> Use a <strong>roda do mouse</strong> para zoom,
          <strong> arraste</strong> para posicionar, e ajuste <strong>rotação/flip</strong> conforme necessário.
          Os <strong className="text-indigo-400">números</strong> mostram as páginas do grid.
          {overlapCm > 0 && (
            <> As <strong className="text-amber-400">áreas amarelas</strong> indicam as zonas de sobreposição ({overlapCm}cm) entre as folhas.</>
          )}
          {' '}Clique em <strong className="text-indigo-400">Centralizar</strong> para resetar.
        </p>
      </div>
    </div>
  );
}

// ✅ OTIMIZADO: Memoizar componente para evitar re-renders desnecessários
// Só re-renderiza quando imageUrl, paperWidthCm, paperHeightCm, cols, ou rows mudarem
export default memo(ImageCropControl);
