'use client';

import { useState, useEffect } from 'react';
import { X, Maximize2, Info, Zap, Loader2 } from 'lucide-react';
import { resizeImage, calculateDimensions } from '@/lib/image-resize';

/**
 * Converte imagem (URL ou base64) para base64 completo
 */
async function normalizeToBase64(image: string): Promise<string> {
  if (!image) throw new Error('Imagem vazia');

  // Se já é base64 válido, retornar
  if (image.startsWith('data:image/')) {
    return image;
  }

  // Se é URL (http/https), baixar e converter para base64
  if (image.startsWith('http://') || image.startsWith('https://')) {
    console.log('[ResizeModal] Convertendo URL para base64:', image.substring(0, 80));

    try {
      const response = await fetch(image);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[ResizeModal] Erro ao converter URL para base64:', error);
      throw new Error('Erro ao carregar imagem da URL');
    }
  }

  // Se é base64 puro (sem prefixo), adicionar prefixo
  let format = 'png';
  if (image.startsWith('/9j/') || image.includes('/9j/')) {
    format = 'jpeg';
  } else if (image.startsWith('iVBOR')) {
    format = 'png';
  }

  console.log('[ResizeModal] Adicionando prefixo base64, formato:', format);
  return `data:image/${format};base64,${image}`;
}

interface ResizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string;
  currentWidthCm: number;
  currentHeightCm: number;
  onResizeComplete: (newImage: string, newWidthCm: number, newHeightCm: number) => void;
}

export default function ResizeModal({
  isOpen,
  onClose,
  currentImage,
  currentWidthCm,
  currentHeightCm,
  onResizeComplete
}: ResizeModalProps) {
  const [targetWidthCm, setTargetWidthCm] = useState(currentWidthCm);
  const [targetHeightCm, setTargetHeightCm] = useState(currentHeightCm);
  const [targetDpi, setTargetDpi] = useState(300);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<any>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [actualWidthCm, setActualWidthCm] = useState(currentWidthCm);
  const [actualHeightCm, setActualHeightCm] = useState(currentHeightCm);

  // Obter dimensões originais da imagem e calcular tamanho real
  useEffect(() => {
    if (!currentImage) return;

    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
      
      // Calcular tamanho real baseado em DPI 300 (padrão profissional)
      // Se currentWidthCm for muito pequeno (< 10), provavelmente está errado
      let realWidthCm = currentWidthCm;
      let realHeightCm = currentHeightCm;
      
      if (currentWidthCm < 10 || currentHeightCm < 10) {
        // Valores parecem incorretos, calcular baseado em 300 DPI
        realWidthCm = Number(((img.width / 300) * 2.54).toFixed(1));
        realHeightCm = Number(((img.height / 300) * 2.54).toFixed(1));
        console.log('[ResizeModal] Valores corrigidos:', { 
          original: { currentWidthCm, currentHeightCm },
          calculated: { realWidthCm, realHeightCm }
        });
      }
      
      setActualWidthCm(realWidthCm);
      setActualHeightCm(realHeightCm);
      setTargetWidthCm(realWidthCm);
      setTargetHeightCm(realHeightCm);
      
      updatePreview(img.width, img.height, realWidthCm, realHeightCm, targetDpi);
    };
    img.onerror = (error) => {
      console.error('[ResizeModal] Erro ao carregar imagem:', error);
      console.log('[ResizeModal] Imagem:', currentImage.substring(0, 100));
    };
    img.src = currentImage;
  }, [currentImage]);

  // Atualizar preview quando dimensões mudam
  useEffect(() => {
    if (!originalDimensions) return;
    updatePreview(originalDimensions.width, originalDimensions.height, targetWidthCm, targetHeightCm, targetDpi);
  }, [targetWidthCm, targetHeightCm, targetDpi, originalDimensions]);

  const updatePreview = (
    origWidth: number,
    origHeight: number,
    widthCm: number,
    heightCm: number,
    dpi: number
  ) => {
    try {
      // Validar inputs
      if (!origWidth || !origHeight || !widthCm || widthCm <= 0) {
        console.warn('[ResizeModal] Invalid dimensions for preview');
        return;
      }

      const result = calculateDimensions(origWidth, origHeight, widthCm, heightCm, dpi);

      const originalTotalPixels = origWidth * origHeight;
      const finalTotalPixels = result.widthPx * result.heightPx;
      const isUpscaling = finalTotalPixels > originalTotalPixels;
      const algorithm = isUpscaling ? 'Lanczos3' : 'Mitchell';

      // Calcular DPI original estimado usando actualWidthCm (tamanho real calculado)
      const originalDpi = Math.round((origWidth / widthCm) * 2.54);

      setPreviewInfo({
        ...result,
        isUpscaling,
        algorithm,
        originalDpi,
        pixelChange: Math.round(((finalTotalPixels - originalTotalPixels) / originalTotalPixels) * 100)
      });
    } catch (error: any) {
      console.error('Erro ao calcular preview:', error);
      console.error('Params:', { origWidth, origHeight, widthCm, heightCm, dpi });
    }
  };

  const handleResize = async () => {
    setIsProcessing(true);

    try {
      // Converter para base64 (seja URL ou base64 puro)
      const imageToResize = await normalizeToBase64(currentImage);

      console.log('[ResizeModal] Imagem normalizada:', {
        hasPrefix: imageToResize.startsWith('data:image/'),
        length: imageToResize.length,
        preview: imageToResize.substring(0, 50)
      });

      const result = await resizeImage(imageToResize, {
        targetWidthCm,
        targetHeightCm: maintainAspect ? undefined : targetHeightCm,
        dpi: targetDpi,
        maintainAspect
      });

      console.log('[ResizeModal] Resize concluído:', result.metadata);

      // Chamar callback com nova imagem
      onResizeComplete(
        result.image,
        result.metadata.finalWidthCm,
        result.metadata.finalHeightCm
      );

      onClose();
    } catch (error: any) {
      console.error('[ResizeModal] Erro ao fazer resize:', error);
      alert('Erro ao redimensionar: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWidthChange = (value: number) => {
    setTargetWidthCm(value);
    if (maintainAspect && originalDimensions) {
      const aspectRatio = originalDimensions.width / originalDimensions.height;
      const newHeight = Number((value / aspectRatio).toFixed(1));
      setTargetHeightCm(newHeight);
    }
  };

  const handleHeightChange = (value: number) => {
    setTargetHeightCm(value);
    if (maintainAspect && originalDimensions) {
      const aspectRatio = originalDimensions.width / originalDimensions.height;
      const newWidth = Number((value * aspectRatio).toFixed(1));
      setTargetWidthCm(newWidth);
    }
  };

  const suggestOptimalSize = () => {
    if (!originalDimensions) return;

    // Calcular tamanho que resulte em 300 DPI
    const optimalWidthCm = Number(((originalDimensions.width / 300) * 2.54).toFixed(1));
    const optimalHeightCm = Number(((originalDimensions.height / 300) * 2.54).toFixed(1));

    setTargetWidthCm(optimalWidthCm);
    setTargetHeightCm(optimalHeightCm);
    setTargetDpi(300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 size={20} className="text-emerald-400" />
            <h2 className="text-white font-semibold text-lg">Otimizar Qualidade / Redimensionar</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Atual */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <Info size={14} className="text-blue-400" />
              Informações Atuais
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-zinc-500 text-xs mb-1">Resolução</p>
                <p className="text-white text-sm font-mono">
                  {originalDimensions?.width} × {originalDimensions?.height}px
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Tamanho Físico</p>
                <p className="text-white text-sm font-mono">
                  {actualWidthCm} × {actualHeightCm}cm
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">DPI Atual</p>
                <p className="text-white text-sm font-mono">
                  {previewInfo?.originalDpi || 0} DPI
                </p>
              </div>
            </div>
          </div>

          {/* Controles de Redimensionamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium text-sm">Novo Tamanho</h3>
              <button
                onClick={suggestOptimalSize}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Zap size={12} /> Sugerir Tamanho Ideal
              </button>
            </div>

            {/* Largura */}
            <div>
              <label className="text-zinc-400 text-xs block mb-2">Largura (cm)</label>
              <input
                type="number"
                value={targetWidthCm}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                min="1"
                max="500"
                step="0.1"
                disabled={isProcessing}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Altura */}
            <div>
              <label className="text-zinc-400 text-xs block mb-2">Altura (cm)</label>
              <input
                type="number"
                value={targetHeightCm}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                min="1"
                max="500"
                step="0.1"
                disabled={isProcessing || maintainAspect}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Manter Proporção */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <label className="text-white text-sm">Manter Proporção</label>
              <button
                onClick={() => setMaintainAspect(!maintainAspect)}
                disabled={isProcessing}
                className={`w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                  maintainAspect ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    maintainAspect ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* DPI */}
            <div>
              <label className="text-zinc-400 text-xs block mb-2">DPI de Saída</label>
              <select
                value={targetDpi}
                onChange={(e) => setTargetDpi(Number(e.target.value))}
                disabled={isProcessing}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              >
                <option value={150}>150 DPI (Mínimo)</option>
                <option value={200}>200 DPI (Bom)</option>
                <option value={300}>300 DPI (Profissional) ⭐</option>
                <option value={600}>600 DPI (Ultra)</option>
              </select>
            </div>
          </div>

          {/* Preview do Resultado */}
          {previewInfo && (
            <div className={`border rounded-lg p-4 ${
              previewInfo.isUpscaling
                ? 'bg-blue-900/20 border-blue-800'
                : 'bg-emerald-900/20 border-emerald-800'
            }`}>
              <h3 className="text-white font-medium text-sm mb-3">Preview do Resultado</h3>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-zinc-400 text-xs mb-1">Nova Resolução</p>
                  <p className="text-white text-sm font-mono">
                    {previewInfo.widthPx} × {previewInfo.heightPx}px
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs mb-1">DPI Final</p>
                  <p className={`text-sm font-mono font-bold ${
                    targetDpi >= 300 ? 'text-emerald-400' :
                    targetDpi >= 200 ? 'text-blue-400' :
                    targetDpi >= 150 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {targetDpi} DPI
                  </p>
                </div>
              </div>

              <div className={`text-xs p-2 rounded ${
                previewInfo.isUpscaling
                  ? 'bg-blue-900/30 text-blue-300'
                  : 'bg-emerald-900/30 text-emerald-300'
              }`}>
                <strong>Algoritmo:</strong> {previewInfo.algorithm} (
                {previewInfo.isUpscaling ? 'Upscale' : 'Downscale'} •{' '}
                {previewInfo.pixelChange > 0 ? '+' : ''}{previewInfo.pixelChange}% pixels
                )
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleResize}
              disabled={isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Maximize2 size={18} />
                  Aplicar Resize
                </>
              )}
            </button>
          </div>

          {/* Aviso */}
          <p className="text-zinc-500 text-xs text-center">
            {previewInfo?.isUpscaling
              ? '⚠️ Upscale pode não adicionar detalhes reais, apenas aumenta pixels'
              : '✓ Downscale manterá toda a qualidade reduzindo tamanho do arquivo'}
          </p>
        </div>
      </div>
    </div>
  );
}
