'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
// import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Wand2, Palette, Upload, ArrowRight, X, Droplet, ChevronUp, ChevronDown, Grid3x3, Image as ImageIcon, ChevronLeft, ChevronRight, FlipHorizontal, FlipVertical, CheckCircle, XCircle } from 'lucide-react';
// Note: Download, Copy, Check icons moved to extracted components
import type { Area } from 'react-easy-crop';
import { useTranslations } from 'next-intl';
import EnhanceResult from '@/components/tools/EnhanceResult';
import RemoveBgResult from '@/components/tools/RemoveBgResult';
import ColorMatchResult from '@/components/tools/ColorMatchResult';
import SplitA4Config from '@/components/tools/SplitA4Config';
import SplitA4Result from '@/components/tools/SplitA4Result';

type ToolMode = 'ENHANCE' | 'COLOR_MATCH' | 'SPLIT_A4' | 'REMOVE_BG';

export default function ToolsPage() {
  const t = useTranslations('tools');

  const INK_BRANDS = [
    t('inkBrands.generic'),
    "Electric Ink",
    "Eternal Ink",
    "Intenze Ink",
    "World Famous",
    "Dynamic Color",
    "Solid Ink",
    "Viper Ink",
    "Iron Works",
    "Radiant Colors"
  ];

  const [activeMode, setActiveMode] = useState<ToolMode>('ENHANCE');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [colorResult, setColorResult] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>(INK_BRANDS[0]);
  const [isLocked, setIsLocked] = useState(false);
  const [showInput, setShowInput] = useState(true);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Espelhar imagem
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Estados para Split A4
  const [splitResult, setSplitResult] = useState<any | null>(null);
  const [numA4s, setNumA4s] = useState<1 | 2 | 4 | 6 | 8>(2); // Quantidade de A4s
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [overlapCm, setOverlapCm] = useState<number>(0.5); // overlap entre páginas
  const [processMode, setProcessMode] = useState<'reference' | 'topographic' | 'perfect_lines' | 'anime'>('reference');
  const [imageSource, setImageSource] = useState<'upload' | 'gallery'>('upload');
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1); // largura/altura real da imagem
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null); // Dimensões reais da imagem

  // Estado para carousel de galeria de upload
  const [currentGalleryPage, setCurrentGalleryPage] = useState<number>(0);
  const IMAGES_PER_PAGE = 6; // 2 colunas x 3 linhas

  // Estados do crop (react-easy-crop)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [cropFlip, setCropFlip] = useState<{ horizontal: boolean; vertical: boolean }>({ horizontal: false, vertical: false });

  // ✅ NOVO: Estados para offset (posicionamento no grid)
  const [offsetXCm, setOffsetXCm] = useState<number>(0);
  const [offsetYCm, setOffsetYCm] = useState<number>(0);

  // Dimensões A4: 21cm x 29.7cm
  const A4_WIDTH = 21;
  const A4_HEIGHT = 29.7;

  // ========================================================================
  // SISTEMA DE PRINT LAYOUT PROFISSIONAL
  // ========================================================================
  // MODELO:
  // - Canvas Global: Espaço infinito em CM (unidades físicas reais)
  // - Imagem: Artwork com dimensões calculadas para caber no grid de A4s
  // - A4 Viewport: Janela móvel que recorta a imagem (controlado por offset)
  // - Multi-páginas: Grid de A4s que cobre a imagem completamente
  // ========================================================================

  const calculateDimensions = () => {
    const layouts: Record<number, { cols: number; rows: number }> = {
      1: { cols: 1, rows: 1 },
      2: orientation === 'portrait' ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 },
      4: { cols: 2, rows: 2 },
      6: { cols: 3, rows: 2 }, // 3 em cima, 3 embaixo
      8: { cols: 4, rows: 2 }, // 4 em cima, 4 embaixo
    };

    const layout = layouts[numA4s];

    // Dimensões TOTAIS do grid de A4s (área de impressão disponível)
    const gridWidth = layout.cols * A4_WIDTH;
    const gridHeight = layout.rows * A4_HEIGHT;

    // Aspect ratio do grid
    const gridAspectRatio = gridWidth / gridHeight;

    // ✅ PREENCHER TODO O GRID (object-fit: cover)
    // A imagem VAI COBRIR todo o grid, pode cortar bordas mas SEM espaços em branco!
    let tattooWidth: number;
    let tattooHeight: number;

    if (imageAspectRatio > gridAspectRatio) {
      // Imagem mais LARGA que grid → usar ALTURA completa, largura vai sobrar
      tattooHeight = gridHeight;
      tattooWidth = gridHeight * imageAspectRatio;
    } else {
      // Imagem mais ALTA que grid → usar LARGURA completa, altura vai sobrar
      tattooWidth = gridWidth;
      tattooHeight = gridWidth / imageAspectRatio;
    }

    return {
      width: tattooWidth,
      height: tattooHeight,
      cols: layout.cols,
      rows: layout.rows,
      gridWidth,
      gridHeight
    };
  };

  const { width: tattooWidth, height: tattooHeight, cols, rows, gridWidth, gridHeight } = calculateDimensions();

  // Obter dimensões do papel selecionado
  const getPaperDimensions = () => {
    const papers = {
      A4: { width: 21, height: 29.7 },
      A3: { width: 29.7, height: 42 },
      Letter: { width: 21.59, height: 27.94 },
    };
    const paper = papers[paperSize];
    return orientation === 'portrait'
      ? { width: paper.width, height: paper.height }
      : { width: paper.height, height: paper.width };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if tools are unlocked using user status
  useEffect(() => {
    const checkToolsStatus = async () => {
      try {
        const res = await fetch('/api/user/status');
        if (res.ok) {
          const data = await res.json();
          setIsLocked(!data.toolsUnlocked);
        } else {
          setIsLocked(true);
        }
      } catch {
        // Em caso de erro, assume que está desbloqueado (verificação na API)
        setIsLocked(false);
      }
    };
    checkToolsStatus();

    // Carregar configurações salvas
    const savedConfig = localStorage.getItem('blacklinepro_tools_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.paperSize) setPaperSize(config.paperSize);
        if (config.numA4s) setNumA4s(config.numA4s);
        if (config.orientation) setOrientation(config.orientation);
        if (config.overlapCm !== undefined) setOverlapCm(config.overlapCm);
        if (config.processMode) setProcessMode(config.processMode);
      } catch (e) {
        console.error('Erro ao carregar config:', e);
      }
    }
  }, []);

  // Salvar configurações quando mudar
  useEffect(() => {
    const config = { paperSize, numA4s, orientation, overlapCm, processMode };
    localStorage.setItem('blacklinepro_tools_config', JSON.stringify(config));
  }, [paperSize, numA4s, orientation, overlapCm, processMode]);


  // Converter URL para base64 - tenta canvas, fallback para proxy API
  const urlToBase64 = async (url: string): Promise<string> => {
    // Tentar método canvas primeiro (mais rápido)
    try {
      return await new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          try {
            const base64 = canvas.toDataURL('image/png');
            resolve(base64);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Canvas method failed'));
        img.src = url;
      });
    } catch (canvasError) {
      // Fallback: usar API proxy
      const response = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to proxy image');
      }

      const data = await response.json();
      return data.base64;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imageUrl = ev.target?.result as string;
        setInputImage(imageUrl);
        setResultImage(null);
        setColorResult(null);

        // Carregar imagem para obter dimensões reais
        const img = new window.Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          setImageAspectRatio(aspectRatio);
          setImageDimensions({ width: img.width, height: img.height }); // GUARDAR DIMENSÕES REAIS
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Helper de segurança extrema para evitar Erro 413 (Payload Too Large)
  const compressImageIfNeeded = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        // 1024px é o tamanho perfeito: leve para o servidor e ideal para a IA fazer o upscale
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Qualidade 0.6: Garante que o arquivo fique abaixo de 1MB, evitando o erro 413 da Vercel
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        console.log(`[BLACK LINE PRO] Imagem otimizada para envio: ${(compressedBase64.length / 1024 / 1024).toFixed(2)}MB`);
        resolve(compressedBase64);
      };

      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleProcess = async () => {
    if (!inputImage) return;
    setIsProcessing(true);

    try {
      if (activeMode === 'ENHANCE') {
        const processingImage = await compressImageIfNeeded(inputImage);
        const res = await fetch('/api/tools/enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: processingImage }),
        });
        const data = await res.json();
        if (res.ok) {
          setResultImage(data.image);
          showToast(t('messages.enhanceSuccess'), 'success');
          // Esconder input em mobile após resultado
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          showToast(data.error || 'Erro ao aprimorar imagem', 'error');
        }
      } else if (activeMode === 'COLOR_MATCH') {
        const processingImage = await compressImageIfNeeded(inputImage);
        const res = await fetch('/api/tools/color-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: processingImage, brand: selectedBrand }),
        });
        const data = await res.json();
        if (res.ok) {
          setColorResult(data);
          showToast(t('messages.colorMatchSuccess'), 'success');
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          showToast(data.error || 'Erro ao analisar cores', 'error');
        }
      } else if (activeMode === 'SPLIT_A4') {
        const paper = getPaperDimensions();

        // ✅ react-easy-crop JÁ retorna croppedArea na escala da imagem original
        // Não precisa re-escalar!

        const res = await fetch('/api/tools/split-a4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: inputImage,
            tattooWidth: tattooWidth, // ✅ CORRIGIDO: Usar dimensões REAIS da imagem escalada
            tattooHeight: tattooHeight, // ✅ CORRIGIDO: Usar dimensões REAIS da imagem escalada
            offsetX: offsetXCm, // ✅ NOVO: Offset controlado pelo usuário
            offsetY: offsetYCm, // ✅ NOVO: Offset controlado pelo usuário
            paperWidth: paper.width,
            paperHeight: paper.height,
            overlap: overlapCm,
            processMode,
            // Forçar grid fixo baseado na seleção do usuário
            forcedCols: cols,
            forcedRows: rows,
            // ✅ Transformações do ImageCropControl (JÁ na escala correta!)
            croppedArea: croppedArea,
            rotation: cropRotation,
            flip: cropFlip
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSplitResult(data);
          showToast(t('messages.splitSuccess', { count: data.tiles?.length || 0 }), 'success');
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          showToast(data.error || 'Erro ao dividir imagem', 'error');
        }
      } else if (activeMode === 'REMOVE_BG') {
        const processingImage = await compressImageIfNeeded(inputImage);
        const res = await fetch('/api/tools/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: processingImage }),
        });
        const data = await res.json();
        if (res.ok) {
          setResultImage(data.image);
          showToast(t('messages.removeBgSuccess'), 'success');
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          showToast(data.error || 'Erro ao remover fundo', 'error');
        }
      }
    } catch (error) {
      console.error(error);
      showToast(t('messages.processingError'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyColor = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(text);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const reset = () => {
    setInputImage(null);
    setResultImage(null);
    setColorResult(null);
    setSplitResult(null);
    setShowInput(true);
    setImageSource('upload');
    // Reset crop states
    setCroppedArea(null);
    setCropRotation(0);
    setCropFlip({ horizontal: false, vertical: false });
    setImageDimensions(null); // Reset dimensões
    // Reset flip states
    setFlipHorizontal(false);
    setFlipVertical(false);
    // ✅ NOVO: Reset offset
    setOffsetXCm(0);
    setOffsetYCm(0);
    // Reset carousel da galeria
    setCurrentGalleryPage(0);
  };

  const loadGallery = useCallback(async () => {
    setLoadingGallery(true);
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data.images || []);
      }
    } catch (error) {
      console.error('Erro ao carregar galeria:', error);
    } finally {
      setLoadingGallery(false);
    }
  }, []);

  // Carregar galeria quando o modo Split A4 e source=gallery
  useEffect(() => {
    if (activeMode === 'SPLIT_A4' && imageSource === 'gallery' && galleryImages.length === 0) {
      loadGallery();
    }
  }, [activeMode, imageSource, galleryImages, loadGallery]);

  const handleUnlock = async () => {
    window.location.href = '/pricing';
  };

  if (isLocked) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto text-center py-12 lg:py-20">
        <div className="mb-6 lg:mb-8">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wand2 size={32} className="text-zinc-400" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 lg:mb-4">
            {t('locked.title')}
          </h2>
          <p className="text-zinc-400 text-base lg:text-lg">
            {t('locked.subtitle')}
          </p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 lg:p-8 mb-6 lg:mb-8">
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500 text-white mt-1 shrink-0">
                <Wand2 size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('modes.enhance.name')}</h3>
                <p className="text-zinc-400 text-sm">{t('modes.enhance.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500 text-white mt-1 shrink-0">
                <Palette size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('modes.colorMatch.name')}</h3>
                <p className="text-zinc-400 text-sm">{t('modes.colorMatch.description')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500 text-white mt-1 shrink-0">
                <Grid3x3 size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('modes.splitA4.name')}</h3>
                <p className="text-zinc-400 text-sm">{t('modes.splitA4.description')}</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleUnlock}
          variant="gradient"
          size="xl"
          className="w-full sm:w-auto px-8 lg:px-12 py-3 lg:py-4 rounded-lg shadow-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400"
        >
          {t('locked.cta')}
        </Button>

        <p className="text-zinc-500 text-sm mt-4">{t('locked.priceFrom')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 lg:mb-8">
          <h1 className="text-xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">{t('title')}</h1>
          <p className="text-zinc-400 text-sm lg:text-base">{t('subtitle')}</p>
        </div>

        {/* Tool Selector - responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-8">
          <button
            onClick={() => { setActiveMode('ENHANCE'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${activeMode === 'ENHANCE'
                ? 'bg-indigo-900/20 border-indigo-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'ENHANCE' ? 'bg-indigo-500 text-white' : 'bg-zinc-800'}`}>
              <Wand2 size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">{t('modes.enhance.name')}</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">{t('modes.enhance.subtitle')}</div>
            </div>
          </button>

          <button
            onClick={() => { setActiveMode('COLOR_MATCH'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${activeMode === 'COLOR_MATCH'
                ? 'bg-indigo-900/20 border-indigo-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'COLOR_MATCH' ? 'bg-indigo-500 text-white' : 'bg-zinc-800'}`}>
              <Palette size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">{t('modes.colorMatch.name')}</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">{t('modes.colorMatch.subtitle')}</div>
            </div>
          </button>

          <button
            onClick={() => { setActiveMode('SPLIT_A4'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${activeMode === 'SPLIT_A4'
                ? 'bg-indigo-900/20 border-indigo-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'SPLIT_A4' ? 'bg-indigo-500 text-white' : 'bg-zinc-800'}`}>
              <Grid3x3 size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">{t('modes.splitA4.name')}</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">{t('modes.splitA4.subtitle')}</div>
            </div>
          </button>

          <button
            onClick={() => { setActiveMode('REMOVE_BG'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${activeMode === 'REMOVE_BG'
                ? 'bg-indigo-900/20 border-indigo-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'REMOVE_BG' ? 'bg-indigo-500 text-white' : 'bg-zinc-800'}`}>
              <ImageIcon size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">{t('modes.removeBg.name')}</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">{t('modes.removeBg.subtitle')}</div>
            </div>
          </button>
        </div>

        {/* Main Workspace - Stack on mobile, 2 cols on desktop */}
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl min-h-[400px] lg:min-h-[500px] flex flex-col lg:flex-row overflow-hidden">

          {/* Input Area */}
          <div className={`lg:flex-1 p-4 lg:p-8 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col ${!showInput && (resultImage || colorResult || splitResult) ? 'hidden lg:flex' : 'flex'}`}>
            {!inputImage ? (
              activeMode === 'SPLIT_A4' ? (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-zinc-300 font-medium text-sm mb-3">{t('upload.source')}</h3>

                  {/* Source Selector */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => setImageSource('upload')}
                      className={`p-3 rounded-lg border transition-all ${imageSource === 'upload'
                          ? 'bg-indigo-900/20 border-indigo-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                    >
                      <Upload size={20} className="mx-auto mb-1" />
                      <p className="text-xs font-medium">{t('upload.uploadBtn')}</p>
                    </button>
                    <button
                      onClick={() => setImageSource('gallery')}
                      className={`p-3 rounded-lg border transition-all ${imageSource === 'gallery'
                          ? 'bg-indigo-900/20 border-indigo-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                    >
                      <ImageIcon size={20} className="mx-auto mb-1" />
                      <p className="text-xs font-medium">{t('upload.galleryBtn')}</p>
                    </button>
                  </div>

                  {/* Upload Area */}
                  {imageSource === 'upload' ? (
                    <div
                      className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-950/50 hover:border-zinc-500 transition-colors cursor-pointer group min-h-[200px]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      <Upload size={40} className="text-zinc-400 group-hover:text-zinc-400 mb-4 transition-colors" />
                      <p className="text-zinc-400 font-medium text-sm">{t('upload.clickToUpload')}</p>
                      <p className="text-zinc-400 text-xs mt-2">{t('upload.fileTypes')}</p>
                    </div>
                  ) : (
                    /* Gallery Grid com Carousel */
                    <div className="flex-1 flex flex-col">
                      {loadingGallery ? (
                        <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>
                      ) : galleryImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                          <ImageIcon size={40} className="mb-3 opacity-50" />
                          <p className="text-sm">{t('upload.emptyGallery')}</p>
                        </div>
                      ) : (
                        <>
                          {/* Navegação - só mostra se tiver mais de 6 imagens */}
                          {galleryImages.length > IMAGES_PER_PAGE && (
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                              <button
                                onClick={() => setCurrentGalleryPage(Math.max(0, currentGalleryPage - 1))}
                                disabled={currentGalleryPage === 0}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
                              >
                                <ChevronLeft size={12} /> {t('upload.previous')}
                              </button>

                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {Array.from({ length: Math.ceil(galleryImages.length / IMAGES_PER_PAGE) }).map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setCurrentGalleryPage(idx)}
                                      className={`w-1 h-1 rounded-full transition-all ${idx === currentGalleryPage ? 'bg-indigo-500 w-3' : 'bg-zinc-700'
                                        }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-zinc-500 font-mono">
                                  {currentGalleryPage * IMAGES_PER_PAGE + 1}-{Math.min((currentGalleryPage + 1) * IMAGES_PER_PAGE, galleryImages.length)} {t('upload.of')} {galleryImages.length}
                                </span>
                              </div>

                              <button
                                onClick={() => setCurrentGalleryPage(Math.min(Math.ceil(galleryImages.length / IMAGES_PER_PAGE) - 1, currentGalleryPage + 1))}
                                disabled={currentGalleryPage >= Math.ceil(galleryImages.length / IMAGES_PER_PAGE) - 1}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
                              >
                                {t('upload.next')} <ChevronRight size={12} />
                              </button>
                            </div>
                          )}

                          {/* Grid com apenas as imagens da página atual */}
                          <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2">
                              {galleryImages
                                .slice(currentGalleryPage * IMAGES_PER_PAGE, (currentGalleryPage + 1) * IMAGES_PER_PAGE)
                                .map((img: any) => (
                                  <div
                                    key={img.id}
                                    onClick={async () => {
                                      try {
                                        // Converter URL para base64
                                        const base64 = await urlToBase64(img.url);
                                        setInputImage(base64);
                                        setResultImage(null);
                                        setColorResult(null);
                                        setSplitResult(null);

                                        // Carregar imagem da galeria para obter dimensões
                                        const image = new window.Image();
                                        image.onload = () => {
                                          const aspectRatio = image.width / image.height;
                                          setImageAspectRatio(aspectRatio);
                                          setImageDimensions({ width: image.width, height: image.height }); // GUARDAR DIMENSÕES REAIS
                                        };
                                        image.src = base64;
                                      } catch (error) {
                                        console.error('❌ Erro ao carregar da galeria:', error);
                                        alert(t('messages.galleryLoadError'));
                                      }
                                    }}
                                    className="aspect-square bg-zinc-950 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                  >
                                    <img
                                      src={img.url}
                                      alt="Gallery"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-950/50 hover:border-zinc-500 transition-colors cursor-pointer group min-h-[200px] lg:min-h-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <Upload size={40} className="text-zinc-400 group-hover:text-zinc-400 mb-4 transition-colors" />
                  <p className="text-zinc-400 font-medium text-sm lg:text-base">{t('upload.clickToUploadImage')}</p>
                  <p className="text-zinc-400 text-xs lg:text-sm mt-2">{t('upload.fileTypes')}</p>
                </div>
              )
            ) : (
              <div className="flex-col h-full flex">
                <div className="flex justify-between items-center mb-3 lg:mb-4">
                  <h3 className="text-zinc-300 font-medium text-sm">{t('upload.originalImage')}</h3>
                  <div className="flex items-center gap-2">
                    {/* Botões de Espelhar */}
                    <button
                      onClick={() => setFlipHorizontal(!flipHorizontal)}
                      className={`p-1.5 rounded-lg border transition-colors ${flipHorizontal
                          ? 'bg-indigo-900/40 border-indigo-500 text-indigo-300'
                          : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                        }`}
                      title="Espelhar Horizontal"
                    >
                      <FlipHorizontal size={16} />
                    </button>
                    <button
                      onClick={() => setFlipVertical(!flipVertical)}
                      className={`p-1.5 rounded-lg border transition-colors ${flipVertical
                          ? 'bg-indigo-900/40 border-indigo-500 text-indigo-300'
                          : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                        }`}
                      title="Espelhar Vertical"
                    >
                      <FlipVertical size={16} />
                    </button>
                    <Button onClick={reset} variant="ghost" size="icon" className="h-8 w-8 min-h-0 min-w-0 text-zinc-500 hover:text-red-400" aria-label="Fechar">
                      <X size={20} />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 bg-zinc-950 rounded-xl flex items-center justify-center p-2 lg:p-4 overflow-hidden relative min-h-[150px] lg:min-h-0">
                  <img
                    src={inputImage}
                    alt="Input"
                    className="max-w-full max-h-full object-contain rounded shadow-lg transition-transform"
                    style={{
                      transform: `${flipHorizontal ? 'scaleX(-1)' : ''} ${flipVertical ? 'scaleY(-1)' : ''}`.trim() || 'none'
                    }}
                  />
                </div>

                {/* Brand Selector for Color Match */}
                {activeMode === 'COLOR_MATCH' && (
                  <div className="mt-3 lg:mt-4">
                    <label className="block text-xs text-zinc-400 mb-2 font-medium flex items-center gap-1">
                      <Droplet size={14} className="text-indigo-500" />
                      Selecione a Marca da Tinta
                    </label>
                    <div className="relative">
                      <select
                        value={selectedBrand}
                        onChange={(e) => {
                          setSelectedBrand(e.target.value);
                          setColorResult(null);
                        }}
                        disabled={isProcessing}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 lg:p-3 text-sm text-white focus:border-indigo-500 outline-none appearance-none cursor-pointer hover:border-zinc-600 transition-colors"
                      >
                        {INK_BRANDS.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <ArrowRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration for Split A4 - COMPACTO */}
                {activeMode === 'SPLIT_A4' && (
                  <SplitA4Config
                    inputImage={inputImage || ''}
                    paperSize={paperSize}
                    orientation={orientation}
                    numA4s={numA4s}
                    overlapCm={overlapCm}
                    offsetXCm={offsetXCm}
                    offsetYCm={offsetYCm}
                    processMode={processMode}
                    cols={cols}
                    rows={rows}
                    gridWidth={gridWidth}
                    gridHeight={gridHeight}
                    tattooWidth={tattooWidth}
                    tattooHeight={tattooHeight}
                    paperDimensions={getPaperDimensions()}
                    onPaperSizeChange={(value) => {
                      setPaperSize(value);
                      setSplitResult(null);
                    }}
                    onOrientationChange={(value) => {
                      setOrientation(value);
                      setSplitResult(null);
                    }}
                    onNumA4sChange={(value) => {
                      setNumA4s(value);
                      setSplitResult(null);
                    }}
                    onOverlapCmChange={(value) => {
                      setOverlapCm(value);
                      setSplitResult(null);
                    }}
                    onOffsetXCmChange={(value) => {
                      setOffsetXCm(value);
                      setSplitResult(null);
                    }}
                    onOffsetYCmChange={(value) => {
                      setOffsetYCm(value);
                      setSplitResult(null);
                    }}
                    onProcessModeChange={(value) => {
                      setProcessMode(value);
                      setSplitResult(null);
                    }}
                    onCropComplete={(area, rotation, flip) => {
                      setCroppedArea(area);
                      setCropRotation(rotation);
                      setCropFlip(flip);
                    }}
                    onResetCropState={() => {
                      setCroppedArea(null);
                      setCropRotation(0);
                      setCropFlip({ horizontal: false, vertical: false });
                      setOffsetXCm(0);
                      setOffsetYCm(0);
                    }}
                  />
                )}

                <button
                  onClick={handleProcess}
                  disabled={isProcessing || (activeMode === 'ENHANCE' && !!resultImage) || (activeMode === 'COLOR_MATCH' && !!colorResult) || (activeMode === 'SPLIT_A4' && !!splitResult) || (activeMode === 'REMOVE_BG' && !!resultImage)}
                  className={`mt-3 lg:mt-4 w-full py-2.5 lg:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm lg:text-base ${isProcessing
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : activeMode === 'ENHANCE'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                        : activeMode === 'COLOR_MATCH'
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                          : activeMode === 'REMOVE_BG'
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                    }`}
                >
                  {isProcessing ? <LoadingSpinner /> : (
                    <>
                      {activeMode === 'ENHANCE' ? <Wand2 size={18} /> : activeMode === 'COLOR_MATCH' ? <Palette size={18} /> : activeMode === 'REMOVE_BG' ? <ImageIcon size={18} /> : <Grid3x3 size={18} />}
                      {activeMode === 'ENHANCE' ? 'Aprimorar Agora' : activeMode === 'COLOR_MATCH' ? 'Identificar Tintas' : activeMode === 'REMOVE_BG' ? 'Remover Fundo Agora' : 'Dividir em A4s'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Output Area */}
          <div className={`p-4 lg:p-8 bg-zinc-950/30 flex flex-col min-h-[400px] lg:min-h-0 ${(resultImage || colorResult || splitResult) ? 'flex-1' : 'lg:flex-1'
            }`}>
            {/* Mobile toggle */}
            {(resultImage || colorResult || splitResult) && (
              <Button
                onClick={() => setShowInput(!showInput)}
                variant="secondary"
                size="sm"
                className="lg:hidden mb-3 gap-1 self-start"
              >
                {showInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showInput ? 'Ocultar Input' : 'Mostrar Input'}
              </Button>
            )}

            {!resultImage && !colorResult && !splitResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                {isProcessing ? (
                  <div className="text-center">
                    <LoadingSpinner text={
                      activeMode === 'COLOR_MATCH'
                        ? "Consultando catálogo..."
                        : activeMode === 'SPLIT_A4'
                          ? processMode === 'reference'
                            ? "⚡ Dividindo (modo rápido)..."
                            : `🎨 Processando ${processMode === 'topographic' ? 'topográfico' : processMode === 'anime' ? 'ilustração' : 'linhas'}... (10-15s)`
                          : activeMode === 'REMOVE_BG'
                            ? "✂️ Removendo fundo..."
                            : "Processando..."
                    } />
                    {activeMode === 'SPLIT_A4' && processMode !== 'reference' && (
                      <p className="text-xs text-zinc-500 mt-2">Gerando stencil de alta qualidade, aguarde...</p>
                    )}
                  </div>
                ) : (
                  <>
                    <ArrowRight size={28} className="mb-4 opacity-50" />
                    <p className="text-sm">O resultado aparecerá aqui</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-in fade-in duration-500 lg:min-h-0">

                {/* Result for Enhance Mode */}
                {activeMode === 'ENHANCE' && resultImage && (
                  <EnhanceResult resultImage={resultImage} />
                )}

                {/* Result for Remove BG Mode */}
                {activeMode === 'REMOVE_BG' && resultImage && (
                  <RemoveBgResult resultImage={resultImage} />
                )}

                {/* Result for Color Match Mode */}
                {activeMode === 'COLOR_MATCH' && colorResult && (
                  <ColorMatchResult
                    colorResult={colorResult}
                    selectedBrand={selectedBrand}
                    copiedColor={copiedColor}
                    onCopyColor={handleCopyColor}
                  />
                )}

                {/* Result for Split A4 Mode */}
                {activeMode === 'SPLIT_A4' && splitResult && (
                  <SplitA4Result
                    splitResult={splitResult}
                    paperSize={paperSize}
                    orientation={orientation}
                    overlapCm={overlapCm}
                  />
                )}

              </div>
            )}
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
            }`}
        >
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <Button onClick={() => setToast(null)} variant="ghost" size="icon" className="ml-2 h-6 w-6 min-h-0 min-w-0 hover:opacity-70 text-white">
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
