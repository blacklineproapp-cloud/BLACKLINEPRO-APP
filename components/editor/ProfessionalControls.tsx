'use client';

import { Info, Sparkles } from 'lucide-react';
import { type AdjustControls } from '@/lib/stencil-types';

interface ProfessionalControlsProps {
  controls: AdjustControls;
  onChange: (controls: Partial<AdjustControls>) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function ProfessionalControls({
  controls,
  onChange,
  isExpanded,
  onToggleExpand
}: ProfessionalControlsProps) {
  return (
    <div className="border border-purple-800 rounded-lg overflow-hidden bg-purple-900/10">
      {/* Header colapsável */}
      <button
        onClick={onToggleExpand}
        className="w-full p-3 flex items-center justify-between hover:bg-purple-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-white font-medium text-sm">Ferramentas Profissionais</span>
        </div>
        <svg
          className={`w-4 h-4 text-purple-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-4 space-y-6 border-t border-purple-800/50">
          {/* POSTERIZE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-300 text-xs font-medium">Posterize</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={controls.posterize !== null && controls.posterize !== undefined}
                  onChange={(e) => {
                    onChange({
                      posterize: e.target.checked ? 8 : null
                    });
                  }}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500"
                />
                {controls.posterize && (
                  <span className="text-purple-400 text-xs font-mono">
                    {controls.posterize} níveis
                  </span>
                )}
              </div>
            </div>
            {controls.posterize && (
              <>
                <input
                  type="range"
                  min="2"
                  max="32"
                  value={controls.posterize}
                  onChange={(e) => onChange({ posterize: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <p className="text-zinc-500 text-[10px] mt-1">
                  Reduz níveis tonais (Photoshop-style) - menor = mais simples
                </p>
              </>
            )}
          </div>

          {/* LEVELS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-300 text-xs font-medium">Levels</label>
              <input
                type="checkbox"
                checked={controls.levels !== null && controls.levels !== undefined}
                onChange={(e) => {
                  onChange({
                    levels: e.target.checked ? {
                      inputBlack: 0,
                      inputGray: 1.0,
                      inputWhite: 255,
                      outputBlack: 0,
                      outputWhite: 255
                    } : null
                  });
                }}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500"
              />
            </div>
            {controls.levels && (
              <div className="space-y-3 bg-zinc-950 rounded-lg p-3">
                {/* Input Levels */}
                <div className="space-y-2">
                  <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">Input Levels</p>

                  {/* Input Black */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 text-[10px]">Black Point</label>
                      <span className="text-purple-400 text-[10px] font-mono">
                        {controls.levels?.inputBlack ?? 0}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="254"
                      value={controls.levels?.inputBlack ?? 0}
                      onChange={(e) => {
                        const newBlack = Number(e.target.value);
                        const currentWhite = controls.levels?.inputWhite ?? 255;

                        // Garantir que Black sempre seja < White
                        onChange({
                          levels: {
                            ...controls.levels,
                            inputBlack: newBlack,
                            // Se Black >= White, ajustar White automaticamente
                            inputWhite: newBlack >= currentWhite ? Math.min(255, newBlack + 1) : currentWhite
                          }
                        });
                      }}
                      className="w-full accent-purple-500 h-1"
                    />
                  </div>

                  {/* Input Gray (Gamma) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 text-[10px]">Midtones (Gamma)</label>
                      <span className="text-purple-400 text-[10px] font-mono">
                        {(controls.levels?.inputGray ?? 1.0).toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={controls.levels?.inputGray ?? 1.0}
                      onChange={(e) => onChange({
                        levels: { ...controls.levels, inputGray: Number(e.target.value) }
                      })}
                      className="w-full accent-purple-500 h-1"
                    />
                  </div>

                  {/* Input White */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 text-[10px]">White Point</label>
                      <span className="text-purple-400 text-[10px] font-mono">
                        {controls.levels?.inputWhite ?? 255}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="255"
                      value={controls.levels?.inputWhite ?? 255}
                      onChange={(e) => {
                        const newWhite = Number(e.target.value);
                        const currentBlack = controls.levels?.inputBlack ?? 0;

                        // Garantir que White sempre seja > Black
                        onChange({
                          levels: {
                            ...controls.levels,
                            inputWhite: newWhite,
                            // Se White <= Black, ajustar Black automaticamente
                            inputBlack: newWhite <= currentBlack ? Math.max(0, newWhite - 1) : currentBlack
                          }
                        });
                      }}
                      className="w-full accent-purple-500 h-1"
                    />
                  </div>
                </div>

                {/* Output Levels */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">Output Levels</p>

                  {/* Output Black */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 text-[10px]">Output Black</label>
                      <span className="text-purple-400 text-[10px] font-mono">
                        {controls.levels?.outputBlack ?? 0}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="254"
                      value={controls.levels?.outputBlack ?? 0}
                      onChange={(e) => onChange({
                        levels: { ...controls.levels, outputBlack: Number(e.target.value) }
                      })}
                      className="w-full accent-purple-500 h-1"
                    />
                  </div>

                  {/* Output White */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-400 text-[10px]">Output White</label>
                      <span className="text-purple-400 text-[10px] font-mono">
                        {controls.levels?.outputWhite ?? 255}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="255"
                      value={controls.levels?.outputWhite ?? 255}
                      onChange={(e) => onChange({
                        levels: { ...controls.levels, outputWhite: Number(e.target.value) }
                      })}
                      className="w-full accent-purple-500 h-1"
                    />
                  </div>
                </div>

                <p className="text-zinc-500 text-[9px] italic">
                  Ajuste fino de tons estilo Photoshop - Input define range, Output remapeia
                </p>
              </div>
            )}
          </div>

          {/* FIND EDGES */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-300 text-xs font-medium">Find Edges</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={controls.findEdges ?? false}
                  onChange={(e) => onChange({ findEdges: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500"
                />
                {controls.findEdges && (
                  <span className="text-purple-400 text-xs font-mono">
                    {controls.edgeStrength ?? 50}%
                  </span>
                )}
              </div>
            </div>
            {controls.findEdges && (
              <>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={controls.edgeStrength ?? 50}
                  onChange={(e) => onChange({ edgeStrength: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
                <p className="text-zinc-500 text-[10px] mt-1">
                  Detecta bordas para converter fotos em stencils de linha
                </p>
              </>
            )}
          </div>

          {/* CLARITY */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-300 text-xs font-medium">Clarity</label>
              <span className="text-purple-400 text-xs font-mono">
                {(controls.clarity ?? 0) > 0 ? '+' : ''}{controls.clarity ?? 0}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={controls.clarity ?? 0}
              onChange={(e) => onChange({ clarity: Number(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <p className="text-zinc-500 text-[10px] mt-1">
              Contraste local nos meios-tons (Lightroom-style) - adiciona "punch"
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info size={12} className="text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-purple-300 text-[10px] leading-relaxed">
                <strong>Ferramentas profissionais</strong> inspiradas em Photoshop e Lightroom.
                Use <strong>Levels</strong> para controle total sobre tons, <strong>Posterize</strong> para simplificar designs,
                e <strong>Find Edges</strong> para criar stencils de fotos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
