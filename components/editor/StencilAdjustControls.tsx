'use client';

import { useState } from 'react';
import {
  Sliders,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Sparkles,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { AdjustControls, DEFAULT_ADJUST_CONTROLS } from '@/lib/stencil-types';

interface StencilAdjustControlsProps {
  controls: AdjustControls;
  onChange: (controls: AdjustControls) => void;
  onReset: () => void;
  onApplyPreset?: (presetKey: string) => void;
  isProcessing?: boolean;
}

export default function StencilAdjustControls({
  controls,
  onChange,
  onReset,
  onApplyPreset,
  isProcessing = false
}: StencilAdjustControlsProps) {
  const [showIntensity, setShowIntensity] = useState(true);
  const [showTransform, setShowTransform] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);

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

      {/* Presets Rápidos - DESABILITADO TEMPORARIAMENTE */}
      {/* <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2">
        <label className="text-[10px] text-zinc-500 block mb-1.5">Presets</label>
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(STENCIL_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => onApplyPreset(key)}
              disabled={isProcessing}
              className="py-1.5 px-2 rounded text-[10px] font-medium bg-zinc-900 hover:bg-emerald-900/30 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-700 transition-colors disabled:opacity-50"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div> */}

      {/* Seção: Intensidade e Contraste */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowIntensity(!showIntensity)}
          className="w-full p-2 flex items-center justify-between hover:bg-zinc-900/50"
        >
          <span className="text-white font-medium text-xs flex items-center gap-1.5">
            <Sliders size={12} className="text-purple-400" /> Intensidade
          </span>
          <ChevronUp
            size={14}
            className={`text-zinc-500 transition-transform ${showIntensity ? 'rotate-180' : ''}`}
          />
        </button>

        {showIntensity && (
          <div className="px-2 pb-2 space-y-2">
            {/* Brightness */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-zinc-500">Brilho</label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {controls.brightness > 0 ? '+' : ''}{controls.brightness}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={controls.brightness}
                onChange={(e) => handleChange('brightness', Number(e.target.value))}
                disabled={isProcessing}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-zinc-500">Contraste</label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {controls.contrast > 0 ? '+' : ''}{controls.contrast}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                value={controls.contrast}
                onChange={(e) => handleChange('contrast', Number(e.target.value))}
                disabled={isProcessing}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* Threshold */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-zinc-500">Corte P/B</label>
                <span className="text-[10px] text-emerald-400 font-mono">
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
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* Gamma */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-zinc-500">Gamma</label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {controls.gamma.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="1.5"
                step="0.1"
                value={controls.gamma}
                onChange={(e) => handleChange('gamma', Number(e.target.value))}
                disabled={isProcessing}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Seção: Transformações */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTransform(!showTransform)}
          className="w-full p-2 flex items-center justify-between hover:bg-zinc-900/50"
        >
          <span className="text-white font-medium text-xs flex items-center gap-1.5">
            <RotateCw size={12} className="text-blue-400" /> Transformações
          </span>
          <ChevronUp
            size={14}
            className={`text-zinc-500 transition-transform ${showTransform ? 'rotate-180' : ''}`}
          />
        </button>

        {showTransform && (
          <div className="px-2 pb-2 space-y-2">
            {/* Rotation */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-zinc-500">Rotação</label>
                <span className="text-[10px] text-blue-400 font-mono">
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
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Flip Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleChange('flipHorizontal', !controls.flipHorizontal)}
                disabled={isProcessing}
                className={`flex flex-col items-center justify-center py-2 rounded text-[9px] font-medium border transition-colors disabled:opacity-50 ${
                  controls.flipHorizontal
                    ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <FlipHorizontal2 size={14} className="mb-0.5" />
                Flip H
              </button>
              <button
                onClick={() => handleChange('flipVertical', !controls.flipVertical)}
                disabled={isProcessing}
                className={`flex flex-col items-center justify-center py-2 rounded text-[9px] font-medium border transition-colors disabled:opacity-50 ${
                  controls.flipVertical
                    ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <FlipVertical2 size={14} className="mb-0.5" />
                Flip V
              </button>
              <button
                onClick={() => handleChange('invert', !controls.invert)}
                disabled={isProcessing}
                className={`flex flex-col items-center justify-center py-2 rounded text-[9px] font-medium border transition-colors disabled:opacity-50 ${
                  controls.invert
                    ? 'bg-purple-900/30 border-purple-500 text-purple-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <Sparkles size={14} className="mb-0.5" />
                Inverter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Seção: Limpeza */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowCleanup(!showCleanup)}
          className="w-full p-2 flex items-center justify-between hover:bg-zinc-900/50"
        >
          <span className="text-white font-medium text-xs flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" /> Limpeza
          </span>
          <ChevronUp
            size={14}
            className={`text-zinc-500 transition-transform ${showCleanup ? 'rotate-180' : ''}`}
          />
        </button>

        {showCleanup && (
          <div className="px-2 pb-2 space-y-2">
            {/* Remove Noise Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-zinc-500">Remover Ruído</label>
              <button
                onClick={() => handleChange('removeNoise', !controls.removeNoise)}
                disabled={isProcessing}
                className={`w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                  controls.removeNoise ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    controls.removeNoise ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Noise Reduction Amount (só se removeNoise ativo) */}
            {controls.removeNoise && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-zinc-500">Intensidade</label>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {controls.noiseReduction}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.5"
                  value={controls.noiseReduction}
                  onChange={(e) => handleChange('noiseReduction', Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                />
              </div>
            )}

            {/* Sharpen Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-zinc-500">Nitidez</label>
              <button
                onClick={() => handleChange('sharpen', !controls.sharpen)}
                disabled={isProcessing}
                className={`w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                  controls.sharpen ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    controls.sharpen ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Sharpen Amount (só se sharpen ativo) */}
            {controls.sharpen && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-zinc-500">Intensidade</label>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {controls.sharpenAmount}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={controls.sharpenAmount}
                  onChange={(e) => handleChange('sharpenAmount', Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Indicador de processamento */}
      {isProcessing && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-2">
          <div className="text-[10px] text-emerald-300 text-center flex items-center justify-center gap-1.5">
            <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Processando ajustes...
          </div>
        </div>
      )}
    </div>
  );
}
