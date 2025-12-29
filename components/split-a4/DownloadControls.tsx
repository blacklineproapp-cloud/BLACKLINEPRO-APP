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
  const [downloadType, setDownloadType] = useState<'zip' | 'pdf' | 'single' | 'all-png' | null>(null);

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

  const handleDownloadAllPng = async () => {
    setIsDownloading(true);
    setDownloadType('all-png');

    try {
      // Baixar cada tile sequencialmente com delay de 200ms entre cada um
      for (const tile of tiles) {
        downloadSingleTile(tile, filename);
        // Delay para evitar problemas de download simultâneo no navegador
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error: any) {
      alert('Erro ao baixar imagens: ' + error.message);
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botões principais de download */}
      <div className="grid grid-cols-2 gap-2">
        {/* Download Todas PNG */}
        <button
          onClick={handleDownloadAllPng}
          disabled={isDownloading}
          className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading && downloadType === 'all-png' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Baixando...
            </>
          ) : (
            <>
              <Download size={18} />
              Todas PNG
            </>
          )}
        </button>

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
              ZIP
            </>
          )}
        </button>
      </div>

      {/* Segunda linha - PDF */}
      <button
        onClick={handleDownloadPdf}
        disabled={isDownloading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Informações */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-2.5">
        <p className="text-[10px] text-blue-300 leading-relaxed">
          <strong>Todas PNG:</strong> Baixa todas as páginas PNG sequencialmente<br />
          <strong>ZIP:</strong> Todas as páginas PNG + instruções (compactado)<br />
          <strong>PDF:</strong> Documento multi-página pronto para impressão
        </p>
      </div>
    </div>
  );
}
