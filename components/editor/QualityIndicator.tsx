'use client';

import { useState, useEffect } from 'react';
import { Info, AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react';

interface QualityIndicatorProps {
  imageBase64: string | null;
  widthCm: number;
  heightCm: number;
  onOptimizeClick?: () => void; // Callback para abrir modal de resize
}

interface ImageInfo {
  widthPx: number;
  heightPx: number;
  estimatedDpi: number;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  warnings: string[];
}

export default function QualityIndicator({ imageBase64, widthCm, heightCm, onOptimizeClick }: QualityIndicatorProps) {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!imageBase64) {
      setImageInfo(null);
      return;
    }

    // Obter dimensões da imagem
    const img = new Image();
    img.onload = () => {
      const widthPx = img.width;
      const heightPx = img.height;

      // Calcular DPI estimado baseado nas dimensões físicas
      const estimatedDpiWidth = Math.round((widthPx / widthCm) * 2.54);
      const estimatedDpiHeight = Math.round((heightPx / heightCm) * 2.54);
      const estimatedDpi = Math.round((estimatedDpiWidth + estimatedDpiHeight) / 2);

      // Determinar qualidade
      let quality: 'excellent' | 'good' | 'acceptable' | 'poor';
      const warnings: string[] = [];

      if (estimatedDpi >= 300) {
        quality = 'excellent';
      } else if (estimatedDpi >= 200) {
        quality = 'good';
        warnings.push('DPI abaixo do ideal. Recomendado: 300 DPI');
      } else if (estimatedDpi >= 150) {
        quality = 'acceptable';
        warnings.push('DPI baixo. Pode ter perda de qualidade na impressão');
      } else {
        quality = 'poor';
        warnings.push('DPI muito baixo! Qualidade insuficiente para impressão profissional');
      }

      setImageInfo({
        widthPx,
        heightPx,
        estimatedDpi,
        quality,
        warnings
      });
    };

    img.src = imageBase64;
  }, [imageBase64, widthCm, heightCm]);

  if (!imageInfo) return null;

  const qualityConfig = {
    excellent: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-800',
      label: 'Excelente',
      description: 'Ideal para impressão profissional'
    },
    good: {
      icon: CheckCircle2,
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
      border: 'border-blue-800',
      label: 'Boa',
      description: 'Adequada para impressão'
    },
    acceptable: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-800',
      label: 'Aceitável',
      description: 'Qualidade mínima aceitável'
    },
    poor: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      border: 'border-red-800',
      label: 'Baixa',
      description: 'Não recomendado para impressão'
    }
  };

  const config = qualityConfig[imageInfo.quality];
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg overflow-hidden ${config.border} ${config.bg}`}>
      {/* Header compacto */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 flex items-center justify-between hover:bg-zinc-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info size={12} className={config.color} />
          <span className="text-white text-xs font-medium">Informações de Qualidade</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${config.color}`}>
            {config.label}
          </span>
          <svg
            className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-zinc-800/50">
          {/* Grid de informações */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Resolução */}
            <div className="bg-zinc-900/50 rounded p-1.5">
              <p className="text-[9px] text-zinc-500 mb-0.5">Resolução</p>
              <p className="text-white text-xs font-mono">
                {imageInfo.widthPx} × {imageInfo.heightPx}px
              </p>
            </div>

            {/* DPI */}
            <div className="bg-zinc-900/50 rounded p-1.5">
              <p className="text-[9px] text-zinc-500 mb-0.5">DPI Estimado</p>
              <p className={`text-xs font-mono font-bold ${config.color}`}>
                {imageInfo.estimatedDpi} DPI
              </p>
            </div>

            {/* Tamanho físico */}
            <div className="bg-zinc-900/50 rounded p-1.5">
              <p className="text-[9px] text-zinc-500 mb-0.5">Tamanho Físico</p>
              <p className="text-white text-xs font-mono">
                {widthCm} × {heightCm} cm
              </p>
            </div>

            {/* Status */}
            <div className="bg-zinc-900/50 rounded p-1.5">
              <p className="text-[9px] text-zinc-500 mb-0.5">Status</p>
              <div className="flex items-center gap-1">
                <Icon size={12} className={config.color} />
                <p className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </p>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-[10px] text-zinc-400 text-center">
            {config.description}
          </p>

          {/* Botão Otimizar (se DPI < 300) */}
          {imageInfo.quality !== 'excellent' && onOptimizeClick && (
            <button
              onClick={onOptimizeClick}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Zap size={14} />
              Otimizar Qualidade / Redimensionar
            </button>
          )}

          {/* Avisos */}
          {imageInfo.warnings.length > 0 && (
            <div className="space-y-1">
              {imageInfo.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-1.5 bg-zinc-900/50 rounded p-1.5">
                  <AlertTriangle size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] text-yellow-300 leading-tight">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recomendação */}
          {imageInfo.quality === 'poor' && (
            <div className="bg-red-900/20 border border-red-800 rounded p-2">
              <p className="text-[9px] text-red-300 leading-relaxed">
                <strong>Recomendação:</strong> Aumente a resolução da imagem ou reduza o tamanho físico desejado para melhorar a qualidade de impressão.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
