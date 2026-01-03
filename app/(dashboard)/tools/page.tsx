'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
// import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import DownloadControls from '@/components/split-a4/DownloadControls';
import { Wand2, Palette, Upload, Download, Copy, Check, ArrowRight, X, Droplet, ChevronUp, ChevronDown, Grid3x3, Image as ImageIcon, ChevronLeft, ChevronRight, FlipHorizontal, FlipVertical, CheckCircle, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { TileData } from '@/lib/download-helpers';
import type { Area } from 'react-easy-crop';

const ImageCropControl = dynamic(() => import('@/components/split-a4/ImageCropControl'), { ssr: false });

type ToolMode = 'ENHANCE' | 'COLOR_MATCH' | 'SPLIT_A4' | 'REMOVE_BG';

const INK_BRANDS = [
  "Genérico (Sem marca específica)",
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

export default function ToolsPage() {
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
  const [processMode, setProcessMode] = useState<'reference' | 'topographic' | 'perfect_lines'>('reference');
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
    const savedConfig = localStorage.getItem('stencilflow_tools_config');
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
    localStorage.setItem('stencilflow_tools_config', JSON.stringify(config));
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
        console.log(`[STENCILFLOW] Imagem otimizada para envio: ${(compressedBase64.length / 1024 / 1024).toFixed(2)}MB`);
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
          showToast('Imagem aprimorada com sucesso!', 'success');
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
          showToast('Cores analisadas com sucesso!', 'success');
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
          showToast(`Imagem dividida em ${data.tiles?.length || 'várias'} partes!`, 'success');
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
          showToast('Fundo removido com sucesso!', 'success');
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
      showToast('Erro no processamento. Tente novamente.', 'error');
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
            <Wand2 size={32} className="text-zinc-600" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 lg:mb-4">
            Ferramentas Premium
          </h2>
          <p className="text-zinc-400 text-base lg:text-lg">
            Desbloqueie ferramentas avançadas para seus estênceis
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 lg:p-8 mb-6 lg:mb-8">
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white mt-1 shrink-0">
                <Wand2 size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold">Aprimorar Imagem</h3>
                <p className="text-zinc-400 text-sm">Upscale e restauração 4K</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-pink-500 text-white mt-1 shrink-0">
                <Palette size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold">Color Match</h3>
                <p className="text-zinc-400 text-sm">Análise de paleta de tintas</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500 text-white mt-1 shrink-0">
                <Grid3x3 size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold">Dividir em A4</h3>
                <p className="text-zinc-400 text-sm">Tattoos grandes em múltiplas folhas</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleUnlock}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-8 lg:px-12 py-3 lg:py-4 rounded-lg font-semibold text-base lg:text-lg transition shadow-lg"
        >
          Ver Planos e Preços
        </button>

        <p className="text-zinc-500 text-sm mt-4">A partir de R$ 50/mês</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 lg:mb-8">
          <h1 className="text-xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">Ferramentas de Estúdio</h1>
          <p className="text-zinc-400 text-sm lg:text-base">Recursos avançados de IA para tratamento de imagem e cor.</p>
        </div>

        {/* Tool Selector - responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-8">
          <button
            onClick={() => { setActiveMode('ENHANCE'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${
              activeMode === 'ENHANCE'
                ? 'bg-blue-900/20 border-blue-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'ENHANCE' ? 'bg-blue-500 text-white' : 'bg-zinc-800'}`}>
              <Wand2 size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">Aprimorar</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">Upscale 4K</div>
            </div>
          </button>

          <button
            onClick={() => { setActiveMode('COLOR_MATCH'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${
              activeMode === 'COLOR_MATCH'
                ? 'bg-pink-900/20 border-pink-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'COLOR_MATCH' ? 'bg-pink-500 text-white' : 'bg-zinc-800'}`}>
              <Palette size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">Color Match</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">Paleta tintas</div>
            </div>
          </button>

          <button
            onClick={() => { setActiveMode('SPLIT_A4'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${
              activeMode === 'SPLIT_A4'
                ? 'bg-purple-900/20 border-purple-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'SPLIT_A4' ? 'bg-purple-500 text-white' : 'bg-zinc-800'}`}>
              <Grid3x3 size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">Dividir A4</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">Múltiplas folhas</div>
            </div>
          </button>

          <button
            onClick={() => { setActiveMode('REMOVE_BG'); reset(); }}
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all ${
              activeMode === 'REMOVE_BG'
                ? 'bg-emerald-900/20 border-emerald-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${activeMode === 'REMOVE_BG' ? 'bg-emerald-500 text-white' : 'bg-zinc-800'}`}>
              <ImageIcon size={18} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm lg:text-base">Remover Fundo</div>
              <div className="text-[10px] lg:text-xs opacity-70 hidden sm:block">IA Remove BG</div>
            </div>
          </button>
        </div>

        {/* Main Workspace - Stack on mobile, 2 cols on desktop */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl min-h-[400px] lg:min-h-[500px] flex flex-col lg:flex-row overflow-hidden">
          
          {/* Input Area */}
          <div className={`lg:flex-1 p-4 lg:p-8 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col ${!showInput && (resultImage || colorResult || splitResult) ? 'hidden lg:flex' : 'flex'}`}>
            {!inputImage ? (
              activeMode === 'SPLIT_A4' ? (
                <div className="flex-1 flex flex-col">
                  <h3 className="text-zinc-300 font-medium text-sm mb-3">Fonte da Imagem</h3>

                  {/* Source Selector */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => setImageSource('upload')}
                      className={`p-3 rounded-lg border transition-all ${
                        imageSource === 'upload'
                          ? 'bg-purple-900/20 border-purple-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <Upload size={20} className="mx-auto mb-1" />
                      <p className="text-xs font-medium">Upload</p>
                    </button>
                    <button
                      onClick={() => setImageSource('gallery')}
                      className={`p-3 rounded-lg border transition-all ${
                        imageSource === 'gallery'
                          ? 'bg-purple-900/20 border-purple-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <ImageIcon size={20} className="mx-auto mb-1" />
                      <p className="text-xs font-medium">Galeria</p>
                    </button>
                  </div>

                  {/* Upload Area */}
                  {imageSource === 'upload' ? (
                    <div
                      className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-950/50 hover:border-zinc-500 transition-colors cursor-pointer group min-h-[200px]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                      <Upload size={40} className="text-zinc-600 group-hover:text-zinc-400 mb-4 transition-colors" />
                      <p className="text-zinc-400 font-medium text-sm">Clique para carregar</p>
                      <p className="text-zinc-600 text-xs mt-2">JPG ou PNG</p>
                    </div>
                  ) : (
                    /* Gallery Grid com Carousel */
                    <div className="flex-1 flex flex-col">
                      {loadingGallery ? (
                        <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>
                      ) : galleryImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                          <ImageIcon size={40} className="mb-3 opacity-50" />
                          <p className="text-sm">Galeria vazia</p>
                        </div>
                      ) : (
                        <>
                          {/* Navegação - só mostra se tiver mais de 6 imagens */}
                          {galleryImages.length > IMAGES_PER_PAGE && (
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                              <button
                                onClick={() => setCurrentGalleryPage(Math.max(0, currentGalleryPage - 1))}
                                disabled={currentGalleryPage === 0}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
                              >
                                <ChevronLeft size={12} /> Ant.
                              </button>

                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {Array.from({ length: Math.ceil(galleryImages.length / IMAGES_PER_PAGE) }).map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setCurrentGalleryPage(idx)}
                                      className={`w-1 h-1 rounded-full transition-all ${
                                        idx === currentGalleryPage ? 'bg-purple-500 w-3' : 'bg-zinc-700'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {currentGalleryPage * IMAGES_PER_PAGE + 1}-{Math.min((currentGalleryPage + 1) * IMAGES_PER_PAGE, galleryImages.length)} de {galleryImages.length}
                                </span>
                              </div>

                              <button
                                onClick={() => setCurrentGalleryPage(Math.min(Math.ceil(galleryImages.length / IMAGES_PER_PAGE) - 1, currentGalleryPage + 1))}
                                disabled={currentGalleryPage >= Math.ceil(galleryImages.length / IMAGES_PER_PAGE) - 1}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
                              >
                                Próx. <ChevronRight size={12} />
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
                                        alert('Erro ao carregar imagem da galeria');
                                      }
                                    }}
                                    className="aspect-square bg-zinc-950 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
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
                  <Upload size={40} className="text-zinc-600 group-hover:text-zinc-400 mb-4 transition-colors" />
                  <p className="text-zinc-400 font-medium text-sm lg:text-base">Clique para carregar imagem</p>
                  <p className="text-zinc-600 text-xs lg:text-sm mt-2">JPG ou PNG</p>
                </div>
              )
            ) : (
              <div className="flex-col h-full flex">
                <div className="flex justify-between items-center mb-3 lg:mb-4">
                  <h3 className="text-zinc-300 font-medium text-sm">Imagem Original</h3>
                  <div className="flex items-center gap-2">
                    {/* Botões de Espelhar */}
                    <button 
                      onClick={() => setFlipHorizontal(!flipHorizontal)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        flipHorizontal 
                          ? 'bg-purple-900/40 border-purple-500 text-purple-300' 
                          : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                      }`}
                      title="Espelhar Horizontal"
                    >
                      <FlipHorizontal size={16} />
                    </button>
                    <button 
                      onClick={() => setFlipVertical(!flipVertical)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        flipVertical 
                          ? 'bg-purple-900/40 border-purple-500 text-purple-300' 
                          : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                      }`}
                      title="Espelhar Vertical"
                    >
                      <FlipVertical size={16} />
                    </button>
                    <button onClick={reset} className="text-zinc-500 hover:text-red-400 transition-colors">
                      <X size={20} />
                    </button>
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
                      <Droplet size={14} className="text-pink-500"/>
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
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 lg:p-3 text-sm text-white focus:border-pink-500 outline-none appearance-none cursor-pointer hover:border-zinc-600 transition-colors"
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
                  <div className="mt-3 lg:mt-4 space-y-2.5">

                    {/* Preview Interativo - Manipulação de Imagem */}
                    <div>
                      <ImageCropControl
                        key={`${numA4s}-${orientation}-${paperSize}-${overlapCm}`}
                        imageUrl={inputImage || ''}
                        paperWidthCm={getPaperDimensions().width}
                        paperHeightCm={getPaperDimensions().height}
                        cols={cols}
                        rows={rows}
                        overlapCm={overlapCm}
                        onCropComplete={(area, rotation, flip) => {
                          setCroppedArea(area);
                          setCropRotation(rotation);
                          setCropFlip(flip);
                          // setSplitResult(null); // REMOVIDO: não resetar resultado quando crop muda
                        }}
                      />
                    </div>

                    {/* ━━━ CONFIGURAÇÕES ━━━ */}

                    {/* 1. Papel e Orientação */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">📄 Papel e Orientação</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={paperSize}
                          onChange={(e) => {
                            setPaperSize(e.target.value as any);
                            setSplitResult(null);
                            setCroppedArea(null);
                            setCropRotation(0);
                            setCropFlip({ horizontal: false, vertical: false });
                            setOffsetXCm(0);
                            setOffsetYCm(0);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white"
                        >
                          <option value="A4">A4 (21×30cm)</option>
                          <option value="A3">A3 (30×42cm)</option>
                          <option value="Letter">Letter (22×28cm)</option>
                        </select>
                        <select
                          value={orientation}
                          onChange={(e) => {
                            setOrientation(e.target.value as any);
                            setSplitResult(null);
                            setCroppedArea(null);
                            setCropRotation(0);
                            setCropFlip({ horizontal: false, vertical: false });
                            setOffsetXCm(0);
                            setOffsetYCm(0);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white"
                        >
                          <option value="portrait">Retrato 📄</option>
                          <option value="landscape">Paisagem 📃</option>
                        </select>
                      </div>
                    </div>

                    {/* 2. Grid - Quantidade de Folhas */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">📐 Grid de Páginas</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {([1, 2, 4, 6, 8] as const).map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setNumA4s(num);
                              setSplitResult(null);
                              setCroppedArea(null);
                              setCropRotation(0);
                              setCropFlip({ horizontal: false, vertical: false });
                              setOffsetXCm(0);
                              setOffsetYCm(0);
                            }}
                            className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                              numA4s === num
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>

                      {/* Info Consolidada do Grid */}
                      <div className="mt-2 p-2.5 bg-purple-950/30 border border-purple-800/30 rounded-lg">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="text-purple-300/70">Layout:</span>
                            <span className="text-emerald-400 font-mono font-semibold">
                              {cols}×{rows}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-purple-300/70">Total:</span>
                            <span className="text-purple-400 font-mono font-bold">
                              {numA4s} folha{numA4s > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between col-span-2">
                            <span className="text-purple-300/70">Imagem:</span>
                            <span className="text-purple-400 font-mono">
                              {tattooWidth.toFixed(1)}×{tattooHeight.toFixed(1)}cm
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Ajustes Finos - Overlap e Offset */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">🎯 Ajustes Finos</label>

                      <div className="space-y-2">
                        {/* Overlap */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-zinc-400">Overlap (sobreposição)</span>
                            <span className="text-[10px] text-purple-400 font-mono">{overlapCm.toFixed(1)}cm</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="3"
                            step="0.1"
                            value={overlapCm}
                            onChange={(e) => {
                              setOverlapCm(Number(e.target.value));
                              setSplitResult(null);
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>

                        {/* Offset X e Y */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Offset X */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-zinc-400">Offset X</span>
                              <span className="text-[10px] text-amber-400 font-mono">{offsetXCm.toFixed(1)}cm</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={gridWidth}
                              step="0.1"
                              value={offsetXCm}
                              onChange={(e) => {
                                setOffsetXCm(Number(e.target.value));
                                setSplitResult(null);
                              }}
                              className="w-full accent-amber-500"
                            />
                          </div>

                          {/* Offset Y */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-zinc-400">Offset Y</span>
                              <span className="text-[10px] text-amber-400 font-mono">{offsetYCm.toFixed(1)}cm</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={gridHeight}
                              step="0.1"
                              value={offsetYCm}
                              onChange={(e) => {
                                setOffsetYCm(Number(e.target.value));
                                setSplitResult(null);
                              }}
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-500 italic mt-1">
                          💡 Overlap facilita colagem das folhas. Offset ajusta posição inicial no grid.
                        </p>
                      </div>
                    </div>

                    {/* 4. Modo de Processamento */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1.5 font-medium">🎨 Processamento</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            setProcessMode('reference');
                            setSplitResult(null);
                          }}
                          className={`p-2.5 rounded text-[10px] font-medium transition-all ${
                            processMode === 'reference'
                              ? 'bg-purple-600 text-white border-2 border-purple-400'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
                          }`}
                        >
                          🖼️ Original
                        </button>
                        <button
                          onClick={() => {
                            setProcessMode('topographic');
                            setSplitResult(null);
                          }}
                          className={`p-2.5 rounded text-[10px] font-medium transition-all ${
                            processMode === 'topographic'
                              ? 'bg-purple-600 text-white border-2 border-purple-400'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
                          }`}
                        >
                          🗺️ Topo
                        </button>
                        <button
                          onClick={() => {
                            setProcessMode('perfect_lines');
                            setSplitResult(null);
                          }}
                          className={`p-2.5 rounded text-[10px] font-medium transition-all ${
                            processMode === 'perfect_lines'
                              ? 'bg-purple-600 text-white border-2 border-purple-400'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-2 border-transparent'
                          }`}
                        >
                          📐 Linhas
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                <button
                  onClick={handleProcess}
                  disabled={isProcessing || (activeMode === 'ENHANCE' && !!resultImage) || (activeMode === 'COLOR_MATCH' && !!colorResult) || (activeMode === 'SPLIT_A4' && !!splitResult) || (activeMode === 'REMOVE_BG' && !!resultImage)}
                  className={`mt-3 lg:mt-4 w-full py-2.5 lg:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm lg:text-base ${
                    isProcessing
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : activeMode === 'ENHANCE'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                        : activeMode === 'COLOR_MATCH'
                          ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/20'
                          : activeMode === 'REMOVE_BG'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
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
          <div className={`p-4 lg:p-8 bg-zinc-950/30 flex flex-col min-h-[400px] lg:min-h-0 ${
            (resultImage || colorResult || splitResult) ? 'flex-1' : 'lg:flex-1'
          }`}>
            {/* Mobile toggle */}
            {(resultImage || colorResult || splitResult) && (
              <button
                onClick={() => setShowInput(!showInput)}
                className="lg:hidden mb-3 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs text-zinc-300 self-start"
              >
                {showInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showInput ? 'Ocultar Input' : 'Mostrar Input'}
              </button>
            )}

            {!resultImage && !colorResult && !splitResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                {isProcessing ? (
                  <div className="text-center">
                    <LoadingSpinner text={
                      activeMode === 'COLOR_MATCH'
                        ? "Consultando catálogo..."
                        : activeMode === 'SPLIT_A4'
                          ? processMode === 'reference'
                            ? "⚡ Dividindo (modo rápido)..."
                            : `🎨 Processando ${processMode === 'topographic' ? 'topográfico' : 'linhas'}... (10-15s)`
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
                  <div className="flex flex-col h-full lg:max-h-full">
                    <div className="flex justify-between items-center mb-3 lg:mb-4 flex-shrink-0">
                      <h3 className="text-blue-400 font-medium text-sm flex items-center gap-2">
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
                )}

                {/* Result for Remove BG Mode */}
                {activeMode === 'REMOVE_BG' && resultImage && (
                  <div className="flex flex-col h-full lg:max-h-full">
                    <div className="flex justify-between items-center mb-3 lg:mb-4 flex-shrink-0">
                      <h3 className="text-emerald-400 font-medium text-sm flex items-center gap-2">
                        <ImageIcon size={16} /> Fundo Removido
                      </h3>
                      <a href={resultImage} download="no-background.png" className="text-zinc-400 hover:text-white text-xs flex items-center gap-1">
                        <Download size={14} /> Baixar
                      </a>
                    </div>
                    <div className="flex-1 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] rounded-xl flex items-center justify-center p-2 lg:p-4 overflow-auto min-h-[200px] lg:min-h-0">
                      <img 
                        src={resultImage} 
                        alt="No Background" 
                        className="max-w-full max-h-full object-contain rounded shadow-2xl"
                      />
                    </div>
                  </div>
                )}

                {/* Result for Color Match Mode */}
                {activeMode === 'COLOR_MATCH' && colorResult && (
                  <div className="flex flex-col h-full lg:max-h-full">
                    <div className="mb-4 lg:mb-6 flex-shrink-0">
                      <h3 className="text-pink-400 font-medium text-base lg:text-lg mb-1 flex items-center gap-2">
                        <Palette size={18} /> Tintas Recomendadas
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <p className="text-zinc-400 text-xs lg:text-sm italic pr-2">&quot;{colorResult.summary}&quot;</p>
                        <span className="text-[10px] bg-pink-900/30 text-pink-300 border border-pink-800 px-2 py-1 rounded whitespace-nowrap self-start sm:self-auto">
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
                            onClick={() => handleCopyColor(c.name)}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-all shrink-0"
                            title="Copiar Nome"
                          >
                            {copiedColor === c.name ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-zinc-800 flex-shrink-0">
                      <p className="text-[10px] text-zinc-600 text-center">
                        * Sugestões aproximadas. O tom real pode variar.
                      </p>
                    </div>
                  </div>
                )}

                {/* Result for Split A4 Mode */}
                {activeMode === 'SPLIT_A4' && splitResult && (
                  <div className="flex flex-col min-h-screen lg:h-full lg:max-h-full">
                    <div className="mb-4 flex-shrink-0">
                      <h3 className="text-purple-400 font-medium text-base lg:text-lg mb-1 flex items-center gap-2">
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
                          <div key={page.pageNumber} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 hover:border-purple-500 transition-all group">
                            <div className="aspect-[210/297] bg-white rounded overflow-hidden mb-2 relative">
                              <img
                                src={page.imageData}
                                alt={`Página ${page.pageNumber}`}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                                #{page.pageNumber}
                              </div>
                              {overlapCm > 0 && (
                                <div className="absolute bottom-1 left-1 bg-zinc-900/80 text-purple-300 text-[8px] px-1.5 py-0.5 rounded">
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
                        <p className="text-[10px] text-zinc-600">
                          * Imprima em {paperSize} {orientation === 'portrait' ? 'retrato' : 'paisagem'} sem margens
                        </p>
                        {overlapCm > 0 && (
                          <div className="bg-purple-900/20 border border-purple-800/30 rounded p-2 text-[10px] text-purple-300">
                            💡 <strong>{overlapCm}cm de overlap</strong> entre páginas para facilitar a colagem/alinhamento
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
