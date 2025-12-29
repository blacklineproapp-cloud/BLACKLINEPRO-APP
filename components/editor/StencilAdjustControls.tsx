'use client';

import { useState } from 'react';
import {
  Sliders,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AdjustControls, DEFAULT_ADJUST_CONTROLS } from '@/lib/stencil-types';

interface StencilAdjustControlsProps {
  controls: AdjustControls;
  onChange: (controls: AdjustControls) => void;
  onReset: () => void;
  isProcessing?: boolean;
}

export default function StencilAdjustControls({
  controls,
  onChange,
  onReset,
  isProcessing = false
}: StencilAdjustControlsProps) {
  // Proteção contra controls undefined
  if (!controls) {
    console.error('[StencilAdjustControls] Controls is undefined!');
    return null;
  }

  const handleChange = (key: keyof AdjustControls, value: number | boolean) => {
    onChange({ ...controls, [key]: value });
  };

  return (
    <div className="space-y-3">
      {/* Header com Reset */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Sliders size={16} className="text-emerald-500" />
          Ajustes
        </h3>
        <button
          onClick={onReset}
          disabled={isProcessing}
          className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 disabled:opacity-50"
          title="Resetar todos os ajustes"
        >
          <RefreshCw size={12} /> Resetar
        </button>
      </div>

      {/* Seção: Ajustes Essenciais (sempre visível) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Sliders size={14} className="text-purple-400" />
          <span className="text-white font-medium text-xs">Ajustes Essenciais</span>
        </div>

        {/* Intensidade (Brightness) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] text-zinc-400">Intensidade</label>
            <span className="text-[11px] text-emerald-400 font-mono">
              {controls.brightness > 0 ? '+' : ''}{controls.brightness}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={controls.brightness}
            onChange={(e) => handleChange('brightness', Number(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
            <span>Escuro</span>
            <span>Claro</span>
          </div>
        </div>

        {/* Contraste */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] text-zinc-400">Contraste</label>
            <span className="text-[11px] text-emerald-400 font-mono">
              {controls.contrast > 0 ? '+' : ''}{controls.contrast}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={controls.contrast}
            onChange={(e) => handleChange('contrast', Number(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
            <span>Suave</span>
            <span>Forte</span>
          </div>
        </div>

        {/* Preto/Branco (Threshold) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] text-zinc-400">Preto/Branco</label>
            <span className="text-[11px] text-emerald-400 font-mono">
              {controls.threshold}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={controls.threshold}
            onChange={(e) => handleChange('threshold', Number(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
            <span>Mais preto</span>
            <span>Mais branco</span>
          </div>
        </div>

        {/* Gamma (Meios-tons) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] text-zinc-400">Gamma (Meios-tons)</label>
            <span className="text-[11px] text-emerald-400 font-mono">
              {controls.gamma.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={controls.gamma}
            onChange={(e) => handleChange('gamma', Number(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
            <span>Escuro</span>
            <span>Claro</span>
          </div>
        </div>

        {/* Nitidez */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] text-zinc-400">Nitidez</label>
            <button
              onClick={() => handleChange('sharpen', !controls.sharpen)}
              disabled={isProcessing}
              className={`w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                controls.sharpen ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  controls.sharpen ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {controls.sharpen && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-zinc-500">Intensidade</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {controls.sharpenAmount.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={controls.sharpenAmount}
                onChange={(e) => handleChange('sharpenAmount', Number(e.target.value))}
                disabled={isProcessing}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Seção: Transformações */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <RotateCw size={14} className="text-blue-400" />
          <span className="text-white font-medium text-xs">Transformações</span>
        </div>

        {/* Rotação */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] text-zinc-400">Rotação</label>
            <span className="text-[11px] text-blue-400 font-mono">
              {controls.rotation}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={controls.rotation}
            onChange={(e) => handleChange('rotation', Number(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Botões de Transformação */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleChange('flipHorizontal', !controls.flipHorizontal)}
            disabled={isProcessing}
            className={`flex flex-col items-center justify-center py-2.5 rounded text-[10px] font-medium border transition-colors disabled:opacity-50 ${
              controls.flipHorizontal
                ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <FlipHorizontal2 size={16} className="mb-1" />
            Espelhar H
          </button>
          <button
            onClick={() => handleChange('flipVertical', !controls.flipVertical)}
            disabled={isProcessing}
            className={`flex flex-col items-center justify-center py-2.5 rounded text-[10px] font-medium border transition-colors disabled:opacity-50 ${
              controls.flipVertical
                ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <FlipVertical2 size={16} className="mb-1" />
            Espelhar V
          </button>
          <button
            onClick={() => handleChange('invert', !controls.invert)}
            disabled={isProcessing}
            className={`flex flex-col items-center justify-center py-2.5 rounded text-[10px] font-medium border transition-colors disabled:opacity-50 ${
              controls.invert
                ? 'bg-purple-900/30 border-purple-500 text-purple-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <Sparkles size={16} className="mb-1" />
            Inverter
          </button>
        </div>
      </div>

      {/* Indicador de processamento */}
      {isProcessing && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-2.5">
          <div className="text-[11px] text-emerald-300 text-center flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Processando ajustes...
          </div>
        </div>
      )}
    </div>
  );
}
