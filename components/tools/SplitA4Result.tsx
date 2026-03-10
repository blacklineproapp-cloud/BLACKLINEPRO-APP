'use client';

import { Grid3x3, Download } from 'lucide-react';
import DownloadControls from '@/components/split-a4/DownloadControls';
import { TileData } from '@/lib/download-helpers';

export interface SplitA4ResultProps {
  splitResult: any;
  paperSize: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  overlapCm: number;
}

export default function SplitA4Result({
  splitResult,
  paperSize,
  orientation,
  overlapCm,
}: SplitA4ResultProps) {
  return (
    <div className="flex flex-col min-h-screen lg:h-full lg:max-h-full">
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-indigo-400 font-medium text-base lg:text-lg mb-1 flex items-center gap-2">
          <Grid3x3 size={18} /> Divisão em A4s
        </h3>
        <div className="space-y-1">
          <p className="text-zinc-400 text-xs">
            {splitResult.pages?.length || 0} folha(s) A4 · Grid {splitResult.gridInfo?.cols || 0} × {splitResult.gridInfo?.rows || 0}
          </p>
          <p className="text-zinc-500 text-[10px]">
            ✓ Proporção mantida · Ajustado com controles avançados
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-[400px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
          {splitResult.pages?.map((page: any) => (
            <div key={page.pageNumber} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 hover:border-indigo-500 transition-all group">
              <div className="aspect-[210/297] bg-white rounded overflow-hidden mb-2 relative">
                <img
                  src={page.imageData}
                  alt={`Página ${page.pageNumber}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                  #{page.pageNumber}
                </div>
                {overlapCm > 0 && (
                  <div className="absolute bottom-1 left-1 bg-zinc-900/80 text-indigo-300 text-[8px] px-1.5 py-0.5 rounded">
                    {overlapCm}cm overlap
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">
                  Grid {page.position.col + 1},{page.position.row + 1}
                </span>
                <a
                  href={page.imageData}
                  download={`page-${page.pageNumber}.png`}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <Download size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3 flex-shrink-0">
        {/* Download Controls (ZIP/PDF/Individual) */}
        <DownloadControls
          tiles={splitResult.pages?.map((page: any) => ({
            image: page.imageData,
            pageNumber: page.pageNumber,
            row: page.position.row,
            col: page.position.col
          } as TileData)) || []}
          filename={`stencil-${paperSize.toLowerCase()}-${splitResult.pages?.length}folhas`}
          paperFormat={paperSize.toLowerCase() as 'a4' | 'a3' | 'letter'}
          orientation={orientation}
        />

        <div className="space-y-2">
          <p className="text-[10px] text-zinc-400">
            * Imprima em {paperSize} {orientation === 'portrait' ? 'retrato' : 'paisagem'} sem margens
          </p>
          {overlapCm > 0 && (
            <div className="bg-indigo-900/20 border border-indigo-800/30 rounded p-2 text-[10px] text-indigo-300">
              💡 <strong>{overlapCm}cm de overlap</strong> entre páginas para facilitar a colagem/alinhamento
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
