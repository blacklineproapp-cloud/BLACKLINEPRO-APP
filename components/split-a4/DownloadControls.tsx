'use client';

import { useState } from 'react';
import { Download, FileArchive, FileText, Loader2 } from 'lucide-react';
import { downloadZip, downloadPdf, downloadSingleTile, TileData } from '@/lib/download-helpers';

interface DownloadControlsProps {
  tiles: TileData[];
  filename?: string;
  paperFormat?: 'a4' | 'a3' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export default function DownloadControls({
  tiles,
  filename = 'stencil-a4',
  paperFormat = 'a4',
  orientation = 'portrait'
}: DownloadControlsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState<'zip' | 'pdf' | 'single' | null>(null);

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    setDownloadType('zip');

    try {
      await downloadZip(tiles, filename);
    } catch (error: any) {
      alert('Erro ao gerar ZIP: ' + error.message);
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadType('pdf');

    try {
      await downloadPdf(tiles, filename, paperFormat, orientation);
    } catch (error: any) {
      alert('Erro ao gerar PDF: ' + error.message);
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  const handleDownloadSingle = (tile: TileData) => {
    try {
      downloadSingleTile(tile, filename);
    } catch (error: any) {
      alert('Erro ao baixar página: ' + error.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botões principais de download */}
      <div className="grid grid-cols-2 gap-2">
        {/* Download ZIP */}
        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading && downloadType === 'zip' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <FileArchive size={18} />
              ZIP ({tiles.length} páginas)
            </>
          )}
        </button>

        {/* Download PDF */}
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading && downloadType === 'pdf' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <FileText size={18} />
              PDF ({tiles.length} páginas)
            </>
          )}
        </button>
      </div>

      {/* Download individual */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
        <h4 className="text-white text-xs font-medium mb-2 flex items-center gap-1.5">
          <Download size={12} className="text-blue-400" />
          Download Individual
        </h4>

        <div className="grid grid-cols-4 gap-1.5">
          {tiles.map((tile) => (
            <button
              key={tile.pageNumber}
              onClick={() => handleDownloadSingle(tile)}
              disabled={isDownloading}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-600 text-zinc-400 hover:text-blue-400 py-2 px-1 rounded text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Baixar página ${tile.pageNumber}`}
            >
              #{tile.pageNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Informações */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-2.5">
        <p className="text-[10px] text-blue-300 leading-relaxed">
          <strong>ZIP:</strong> Todas as páginas PNG + instruções de montagem<br />
          <strong>PDF:</strong> Documento multi-página pronto para impressão<br />
          <strong>Individual:</strong> Baixar página específica em PNG
        </p>
      </div>
    </div>
  );
}
