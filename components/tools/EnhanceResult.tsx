'use client';

import { Wand2, Download } from 'lucide-react';

export interface EnhanceResultProps {
  resultImage: string;
}

export default function EnhanceResult({ resultImage }: EnhanceResultProps) {
  return (
    <div className="flex flex-col h-full lg:max-h-full">
      <div className="flex justify-between items-center mb-3 lg:mb-4 flex-shrink-0">
        <h3 className="text-indigo-400 font-medium text-sm flex items-center gap-2">
          <Wand2 size={16} /> Resultado Aprimorado
        </h3>
        <a href={resultImage} download="enhanced-image.png" className="text-zinc-400 hover:text-white text-xs flex items-center gap-1">
          <Download size={14} /> Baixar
        </a>
      </div>
      <div className="flex-1 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] rounded-xl flex items-center justify-center p-2 lg:p-4 overflow-auto min-h-[200px] lg:min-h-0">
        <img
          src={resultImage}
          alt="Enhanced"
          className="max-w-full max-h-full object-contain rounded shadow-2xl"
        />
      </div>
    </div>
  );
}
