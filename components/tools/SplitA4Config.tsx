'use client';

import type { Area } from 'react-easy-crop';
import dynamic from 'next/dynamic';

const ImageCropControl = dynamic(() => import('@/components/split-a4/ImageCropControl'), { ssr: false });

export interface SplitA4ConfigProps {
  inputImage: string;
  paperSize: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  numA4s: 1 | 2 | 4 | 6 | 8;
  overlapCm: number;
  offsetXCm: number;
  offsetYCm: number;
  processMode: 'reference' | 'topographic' | 'perfect_lines' | 'anime';
  cols: number;
  rows: number;
  gridWidth: number;
  gridHeight: number;
  tattooWidth: number;
  tattooHeight: number;
  paperDimensions: { width: number; height: number };
  onPaperSizeChange: (value: 'A4' | 'A3' | 'Letter') => void;
  onOrientationChange: (value: 'portrait' | 'landscape') => void;
  onNumA4sChange: (value: 1 | 2 | 4 | 6 | 8) => void;
  onOverlapCmChange: (value: number) => void;
  onOffsetXCmChange: (value: number) => void;
  onOffsetYCmChange: (value: number) => void;
  onProcessModeChange: (value: 'reference' | 'topographic' | 'perfect_lines' | 'anime') => void;
  onCropComplete: (area: Area, rotation: number, flip: { horizontal: boolean; vertical: boolean }) => void;
  onResetCropState: () => void;
}

export default function SplitA4Config({
  inputImage,
  paperSize,
  orientation,
  numA4s,
  overlapCm,
  offsetXCm,
  offsetYCm,
  processMode,
  cols,
  rows,
  gridWidth,
  gridHeight,
  tattooWidth,
  tattooHeight,
  paperDimensions,
  onPaperSizeChange,
  onOrientationChange,
  onNumA4sChange,
  onOverlapCmChange,
  onOffsetXCmChange,
  onOffsetYCmChange,
  onProcessModeChange,
  onCropComplete,
  onResetCropState,
}: SplitA4ConfigProps) {
  return (
    <div className="mt-3 lg:mt-4 space-y-2.5">

      {/* Preview Interativo - Manipulacao de Imagem */}
      <div>
        <ImageCropControl
          key={`${numA4s}-${orientation}-${paperSize}-${overlapCm}`}
          imageUrl={inputImage}
          paperWidthCm={paperDimensions.width}
          paperHeightCm={paperDimensions.height}
          cols={cols}
          rows={rows}
          overlapCm={overlapCm}
          onCropComplete={(area, rotation, flip) => {
            onCropComplete(area, rotation, flip);
          }}
        />
      </div>

      {/* 1. Papel e Orientacao */}
      <div>
        <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">📄 Papel e Orientação</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={paperSize}
            onChange={(e) => {
              onPaperSizeChange(e.target.value as 'A4' | 'A3' | 'Letter');
              onResetCropState();
            }}
            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white"
          >
            <option value="A4">A4 (21×30cm)</option>
            <option value="A3">A3 (30×42cm)</option>
            <option value="Letter">Letter (22×28cm)</option>
          </select>
          <select
            value={orientation}
            onChange={(e) => {
              onOrientationChange(e.target.value as 'portrait' | 'landscape');
              onResetCropState();
            }}
            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white"
          >
            <option value="portrait">Retrato 📄</option>
            <option value="landscape">Paisagem 📃</option>
          </select>
        </div>
      </div>

      {/* 2. Grid - Quantidade de Folhas */}
      <div>
        <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">📐 Grid de Páginas</label>
        <div className="grid grid-cols-5 gap-1.5">
          {([1, 2, 4, 6, 8] as const).map((num) => (
            <button
              key={num}
              onClick={() => {
                onNumA4sChange(num);
                onResetCropState();
              }}
              className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${numA4s === num
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Info Consolidada do Grid */}
        <div className="mt-2 p-2.5 bg-indigo-950/30 border border-indigo-800/30 rounded-lg">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-indigo-300/70">Layout:</span>
              <span className="text-indigo-400 font-mono font-semibold">
                {cols}×{rows}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-indigo-300/70">Total:</span>
              <span className="text-indigo-400 font-mono font-bold">
                {numA4s} folha{numA4s > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between col-span-2">
              <span className="text-indigo-300/70">Imagem:</span>
              <span className="text-indigo-400 font-mono">
                {tattooWidth.toFixed(1)}×{tattooHeight.toFixed(1)}cm
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ajustes Finos - Overlap e Offset */}
      <div>
        <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">🎯 Ajustes Finos</label>

        <div className="space-y-2">
          {/* Overlap */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-400">Overlap (sobreposição)</span>
              <span className="text-[10px] text-indigo-400 font-mono">{overlapCm.toFixed(1)}cm</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={overlapCm}
              onChange={(e) => onOverlapCmChange(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Offset X e Y */}
          <div className="grid grid-cols-2 gap-2">
            {/* Offset X */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-400">Offset X</span>
                <span className="text-[10px] text-amber-400 font-mono">{offsetXCm.toFixed(1)}cm</span>
              </div>
              <input
                type="range"
                min="0"
                max={gridWidth}
                step="0.1"
                value={offsetXCm}
                onChange={(e) => onOffsetXCmChange(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Offset Y */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-400">Offset Y</span>
                <span className="text-[10px] text-amber-400 font-mono">{offsetYCm.toFixed(1)}cm</span>
              </div>
              <input
                type="range"
                min="0"
                max={gridHeight}
                step="0.1"
                value={offsetYCm}
                onChange={(e) => onOffsetYCmChange(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          <p className="text-[9px] text-zinc-500 italic mt-1">
            💡 Overlap facilita colagem das folhas. Offset ajusta posição inicial no grid.
          </p>
        </div>
      </div>

      {/* 4. Modo de Processamento */}
      <div>
        <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">🎨 Processamento</label>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => onProcessModeChange('reference')}
            className={`p-2 rounded text-[9px] font-medium transition-all ${processMode === 'reference'
                ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
              }`}
          >
            🖼️ Orig
          </button>
          <button
            onClick={() => onProcessModeChange('topographic')}
            className={`p-2 rounded text-[9px] font-medium transition-all ${processMode === 'topographic'
                ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
              }`}
          >
            🗺️ Topo
          </button>
          <button
            onClick={() => onProcessModeChange('perfect_lines')}
            className={`p-2 rounded text-[9px] font-medium transition-all ${processMode === 'perfect_lines'
                ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
              }`}
          >
            📐 Linhas
          </button>
          <button
            onClick={() => onProcessModeChange('anime')}
            className={`p-2 rounded text-[9px] font-medium transition-all ${processMode === 'anime'
                ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
              }`}
            title="Para animes, desenhos, Maori, Tribal"
          >
            🎨 Ilust
          </button>
        </div>
      </div>

    </div>
  );
}
