'use client';

/**
 * DrawingToolbar - Barra de ferramentas para desenho
 * Inclui seleção de ferramentas, tamanhos, cores e ações
 */

import { useState } from 'react';
import {
  Pencil,
  Eraser,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Circle,
  Layers,
} from 'lucide-react';
import type { DrawingTool } from '@/lib/drawing/types';

interface DrawingToolbarProps {
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushColor: string;
  onBrushColorChange: (color: string) => void;
  stencilOpacity?: number;
  onStencilOpacityChange?: (opacity: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  className?: string;
  compact?: boolean;
}

export default function DrawingToolbar({
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  brushColor,
  onBrushColorChange,
  stencilOpacity = 80,
  onStencilOpacityChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onDownload,
  className = '',
  compact = false,
}: DrawingToolbarProps) {
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showBlendPanel, setShowBlendPanel] = useState(false);

  // Cores predefinidas para stencil (preto e tons de cinza)
  const presetColors = [
    '#000000', // Preto
    '#1a1a1a', // Quase preto
    '#333333', // Cinza escuro
    '#666666', // Cinza médio
    '#999999', // Cinza claro
  ];

  // Tamanhos predefinidos (otimizados para precisão em stencil)
  const presetSizes = [
    { label: '1px', value: 1 },
    { label: '2px', value: 2 },
    { label: '3px', value: 3 },
    { label: '4px', value: 4 },
    { label: '6px', value: 6 },
  ];

  return (
    <div
      className={`bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl p-2 ${className}`}
    >
      <div className={`flex ${compact ? 'flex-wrap gap-1' : 'flex-col gap-3'}`}>
        {/* Ferramentas principais */}
        <div className="flex items-center gap-1">
          {/* Caneta */}
          <button
            onClick={() => onToolChange('pen')}
            className={`p-2.5 rounded-lg transition-all ${
              tool === 'pen'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
            title="Caneta (P)"
          >
            <Pencil size={18} />
          </button>

          {/* Borracha */}
          <button
            onClick={() => onToolChange('eraser')}
            className={`p-2.5 rounded-lg transition-all ${
              tool === 'eraser'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
            title="Borracha (E)"
          >
            <Eraser size={18} />
          </button>

          {/* Linha */}
          <button
            onClick={() => onToolChange('line')}
            className={`p-2.5 rounded-lg transition-all ${
              tool === 'line'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
            title="Linha Reta (L)"
          >
            <Minus size={18} />
          </button>

          {!compact && <div className="w-px h-6 bg-zinc-700 mx-1" />}
        </div>

        {/* Tamanho do brush */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSizePanel(!showSizePanel);
              setShowColorPanel(false);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
          >
            <Circle
              size={brushSize > 6 ? 16 : brushSize > 3 ? 12 : 8}
              fill="currentColor"
              className="text-white"
            />
            <span className="text-xs text-zinc-400">{brushSize}px</span>
            {showSizePanel ? (
              <ChevronUp size={14} className="text-zinc-500" />
            ) : (
              <ChevronDown size={14} className="text-zinc-500" />
            )}
          </button>

          {/* Painel de tamanhos */}
          {showSizePanel && (
            <div className={`absolute ${compact ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl z-50 min-w-[180px]`}>
              <p className="text-xs text-zinc-500 mb-2">Tamanho</p>

              {/* Presets */}
              <div className="flex gap-1 mb-3">
                {presetSizes.map((size) => (
                  <button
                    key={size.label}
                    onClick={() => {
                      onBrushSizeChange(size.value);
                      setShowSizePanel(false);
                    }}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                      brushSize === size.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />

              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>1px</span>
                <span>10px</span>
              </div>
            </div>
          )}
        </div>

        {/* Cor do brush (apenas para caneta) */}
        {tool !== 'eraser' && (
          <div className="relative">
            <button
              onClick={() => {
                setShowColorPanel(!showColorPanel);
                setShowSizePanel(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
            >
              <div
                className="w-4 h-4 rounded-full border border-zinc-600"
                style={{ backgroundColor: brushColor }}
              />
              <span className="text-xs text-zinc-400">Cor</span>
              {showColorPanel ? (
                <ChevronUp size={14} className="text-zinc-500" />
              ) : (
                <ChevronDown size={14} className="text-zinc-500" />
              )}
            </button>

            {/* Painel de cores */}
            {showColorPanel && (
              <div className={`absolute ${compact ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl z-50`}>
                <p className="text-xs text-zinc-500 mb-2">Cor</p>

                {/* Cores predefinidas */}
                <div className="flex gap-2 mb-3">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        onBrushColorChange(color);
                        setShowColorPanel(false);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        brushColor === color
                          ? 'border-emerald-500 scale-110'
                          : 'border-zinc-600 hover:border-zinc-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Color picker */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => onBrushColorChange(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs text-zinc-500 font-mono">
                    {brushColor.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controle de Blend/Opacidade do Stencil */}
        {onStencilOpacityChange && (
          <div className="relative">
            <button
              onClick={() => {
                setShowBlendPanel(!showBlendPanel);
                setShowSizePanel(false);
                setShowColorPanel(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
            >
              <Layers size={16} className="text-purple-400" />
              <span className="text-xs text-zinc-400">{stencilOpacity}%</span>
              {showBlendPanel ? (
                <ChevronUp size={14} className="text-zinc-500" />
              ) : (
                <ChevronDown size={14} className="text-zinc-500" />
              )}
            </button>

            {showBlendPanel && (
              <div className={`absolute ${compact ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl z-50 min-w-[200px]`}>
                <p className="text-xs text-zinc-500 mb-2">Opacidade do Stencil (Blend)</p>

                {/* Presets de opacidade */}
                <div className="flex gap-1 mb-3">
                  {[20, 50, 80, 100].map((opacity) => (
                    <button
                      key={opacity}
                      onClick={() => onStencilOpacityChange(opacity)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                        stencilOpacity === opacity
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {opacity}%
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stencilOpacity}
                  onChange={(e) => onStencilOpacityChange(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />

                <p className="text-[10px] text-zinc-600 mt-2 text-center">
                  Ajuste para ver mais da imagem original
                </p>
              </div>
            )}
          </div>
        )}

        {!compact && <div className="w-full h-px bg-zinc-800" />}

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>

          <button
            onClick={onClear}
            className="p-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-red-900/50 hover:text-red-400 transition-all"
            title="Limpar tudo"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {!compact && <div className="w-full h-px bg-zinc-800" />}

        {/* Ações */}
        <div className="flex flex-col gap-2">
          {/* Baixar */}
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all"
          >
            <Download size={16} />
            <span className="text-sm">Baixar</span>
          </button>

        </div>
      </div>

      {/* Dica de atalhos */}
      {!compact && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 text-center">
            Atalhos: P (Caneta) • E (Borracha) • L (Linha) • Ctrl+Z/Y (Desfazer/Refazer)
          </p>
        </div>
      )}
    </div>
  );
}
