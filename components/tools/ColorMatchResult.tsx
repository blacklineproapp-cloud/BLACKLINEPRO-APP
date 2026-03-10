'use client';

import { Palette, Copy, Check } from 'lucide-react';

export interface ColorMatchResultProps {
  colorResult: any;
  selectedBrand: string;
  copiedColor: string | null;
  onCopyColor: (text: string) => void;
}

export default function ColorMatchResult({
  colorResult,
  selectedBrand,
  copiedColor,
  onCopyColor,
}: ColorMatchResultProps) {
  return (
    <div className="flex flex-col h-full lg:max-h-full">
      <div className="mb-4 lg:mb-6 flex-shrink-0">
        <h3 className="text-indigo-400 font-medium text-base lg:text-lg mb-1 flex items-center gap-2">
          <Palette size={18} /> Tintas Recomendadas
        </h3>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <p className="text-zinc-400 text-xs lg:text-sm italic pr-2">&quot;{colorResult.summary}&quot;</p>
          <span className="text-[10px] bg-indigo-900/30 text-indigo-300 border border-indigo-800 px-2 py-1 rounded whitespace-nowrap self-start sm:self-auto">
            {selectedBrand}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 lg:space-y-3 lg:min-h-0 pb-4 lg:pb-0">
        {colorResult.colors?.map((c: any, idx: number) => (
          <div key={idx} className="bg-zinc-900 border border-zinc-800 p-2.5 lg:p-3 rounded-lg flex items-center gap-3 lg:gap-4 hover:border-zinc-700 transition-colors group">
            <div
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-full shadow-inner ring-2 ring-inset ring-black/10 shrink-0 relative group-hover:scale-105 transition-transform"
              style={{ backgroundColor: c.hex }}
              title={`HEX: ${c.hex}`}
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium text-sm truncate" title={c.name}>{c.name}</h4>
              <p className="text-zinc-500 text-[10px] lg:text-xs truncate">{c.usage}</p>
            </div>
            <button
              onClick={() => onCopyColor(c.name)}
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-all shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Copiar Nome"
            >
              {copiedColor === c.name ? <Check size={16} className="text-indigo-500" /> : <Copy size={16} />}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-zinc-800 flex-shrink-0">
        <p className="text-[10px] text-zinc-400 text-center">
          * Sugestões aproximadas. O tom real pode variar.
        </p>
      </div>
    </div>
  );
}
