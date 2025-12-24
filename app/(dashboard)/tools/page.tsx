'use client';

import { useState, useRef, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Wand2, Palette, Upload, Download, Copy, Check, ArrowRight, X, Droplet, ChevronUp, ChevronDown, Grid3x3, Image as ImageIcon } from 'lucide-react';
import dynamic from 'next/dynamic';

const InteractiveGridPreview = dynamic(() => import('@/components/InteractiveGridPreview'), { ssr: false });

type ToolMode = 'ENHANCE' | 'COLOR_MATCH' | 'SPLIT_A4';

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
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1); // largura/altura real da imagem

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
      2: orientation === 'portrait' ? { cols: 1, rows: 2 } : { cols: 2, rows: 1 },
      4: { cols: 2, rows: 2 },
      6: orientation === 'portrait' ? { cols: 2, rows: 3 } : { cols: 3, rows: 2 },
      8: orientation === 'portrait' ? { cols: 2, rows: 4 } : { cols: 4, rows: 2 },
    };

    const layout = layouts[numA4s];

    // Dimensões TOTAIS do grid de A4s (área de impressão disponível)
    const gridWidth = layout.cols * A4_WIDTH;
    const gridHeight = layout.rows * A4_HEIGHT;

    // Aspect ratio do grid
    const gridAspectRatio = gridWidth / gridHeight;

    // ESCALAR imagem para CABER no grid (object-fit: contain)
    // Mantém proporção da imagem, preenche o máximo possível sem estourar
    let tattooWidth: number;
    let tattooHeight: number;

    if (imageAspectRatio > gridAspectRatio) {
      // Imagem mais LARGA que grid → limitar pela LARGURA
      tattooWidth = gridWidth;
      tattooHeight = gridWidth / imageAspectRatio;
    } else {
      // Imagem mais ALTA que grid → limitar pela ALTURA
      tattooHeight = gridHeight;
      tattooWidth = gridHeight * imageAspectRatio;
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
  }, []);

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
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          setImageAspectRatio(aspectRatio);
          console.log(`📐 Imagem carregada: ${img.width}×${img.height}px, aspect ratio: ${aspectRatio.toFixed(2)}`);
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!inputImage) return;
    setIsProcessing(true);

    try {
      if (activeMode === 'ENHANCE') {
        const res = await fetch('/api/tools/enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: inputImage }),
        });
        const data = await res.json();
        if (res.ok) {
          setResultImage(data.image);
          // Esconder input em mobile após resultado
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          alert(data.error || 'Erro ao aprimorar imagem');
        }
      } else if (activeMode === 'COLOR_MATCH') {
        const res = await fetch('/api/tools/color-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: inputImage, brand: selectedBrand }),
        });
        const data = await res.json();
        if (res.ok) {
          setColorResult(data);
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          alert(data.error || 'Erro ao analisar cores');
        }
      } else if (activeMode === 'SPLIT_A4') {
        const paper = getPaperDimensions();
        const res = await fetch('/api/tools/split-a4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: inputImage,
            tattooWidth: gridWidth, // Grid TOTAL, não imagem escalada
            tattooHeight: gridHeight, // Grid TOTAL, não imagem escalada
            offsetX,
            offsetY,
            paperWidth: paper.width,
            paperHeight: paper.height,
            overlap: overlapCm,
            processMode,
            // Forçar grid fixo baseado na seleção do usuário
            forcedCols: cols,
            forcedRows: rows
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSplitResult(data);
          if (window.innerWidth < 1024) {
            setShowInput(false);
          }
        } else if (data.requiresSubscription) {
          if (confirm(`${data.message}\n\nDeseja ${data.subscriptionType === 'tools' ? 'desbloquear ferramentas' : 'assinar'}?`)) {
            window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
          }
        } else {
          alert(data.error || 'Erro ao dividir imagem');
        }
      }
    } catch (error) {
      console.error(error);
      alert("Erro no processamento. Tente novamente.");
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
    setOffsetX(0);
    setOffsetY(0);
  };

  // Carregar galeria quando o modo Split A4 e source=gallery
  useEffect(() => {
    if (activeMode === 'SPLIT_A4' && imageSource === 'gallery' && galleryImages.length === 0) {
      loadGallery();
    }
  }, [activeMode, imageSource]);

  const loadGallery = async () => {
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
  };

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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-8">
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
            className={`p-3 lg:p-4 rounded-xl border flex items-center gap-2 lg:gap-3 transition-all col-span-2 lg:col-span-1 ${
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
                    /* Gallery Grid */
                    <div className="flex-1 overflow-y-auto">
                      {loadingGallery ? (
                        <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>
                      ) : galleryImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                          <ImageIcon size={40} className="mb-3 opacity-50" />
                          <p className="text-sm">Galeria vazia</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {galleryImages.map((img: any) => (
                            <div
                              key={img.id}
                              onClick={() => {
                                setInputImage(img.url);
                                // Carregar imagem da galeria para obter dimensões
                                const image = new Image();
                                image.onload = () => {
                                  const aspectRatio = image.width / image.height;
                                  setImageAspectRatio(aspectRatio);
                                  console.log(`📐 Imagem da galeria: ${image.width}×${image.height}px, aspect ratio: ${aspectRatio.toFixed(2)}`);
                                };
                                image.src = img.url;
                              }}
                              className="aspect-square bg-zinc-950 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                            >
                              <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
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
                  <button onClick={reset} className="text-zinc-500 hover:text-red-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 bg-zinc-950 rounded-xl flex items-center justify-center p-2 lg:p-4 overflow-hidden relative min-h-[150px] lg:min-h-0">
                  <img src={inputImage} alt="Input" className="max-w-full max-h-[200px] lg:max-h-[400px] object-contain rounded shadow-lg" />
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

                    {/* Preview Interativo - DESTAQUE NO TOPO */}
                    <div>
                      <InteractiveGridPreview
                        key={`${numA4s}-${orientation}-${paperSize}`}
                        imageUrl={inputImage || ''}
                        tattooWidthCm={tattooWidth}
                        tattooHeightCm={tattooHeight}
                        paperWidthCm={getPaperDimensions().width}
                        paperHeightCm={getPaperDimensions().height}
                        overlapCm={overlapCm}
                        initialX={offsetX}
                        initialY={offsetY}
                        forcedCols={cols}
                        forcedRows={rows}
                        onPositionChange={(x, y) => {
                          setOffsetX(x);
                          setOffsetY(y);
                          setSplitResult(null);
                        }}
                      />
                    </div>

                    {/* Controles Compactos */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Papel */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">Papel</label>
                        <select
                          value={paperSize}
                          onChange={(e) => {
                            setPaperSize(e.target.value as any);
                            setSplitResult(null);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white"
                        >
                          <option value="A4">A4</option>
                          <option value="A3">A3</option>
                          <option value="Letter">Letter</option>
                        </select>
                      </div>

                      {/* Orientação */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">Orientação</label>
                        <select
                          value={orientation}
                          onChange={(e) => {
                            setOrientation(e.target.value as any);
                            setSplitResult(null);
                            setOffsetX(0);
                            setOffsetY(0);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white"
                        >
                          <option value="portrait">Portrait 📄</option>
                          <option value="landscape">Landscape 📃</option>
                        </select>
                      </div>
                    </div>

                    {/* Seletor de Quantidade de A4s */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1.5 flex items-center gap-1">
                        <span>Quantidade de A4s</span>
                        <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded">auto-dimensionado</span>
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {([1, 2, 4, 6, 8] as const).map((num) => (
                          <button
                            key={num}
                            onClick={() => {
                              setNumA4s(num);
                              setSplitResult(null);
                              setOffsetX(0);
                              setOffsetY(0);
                            }}
                            className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                              numA4s === num
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>

                      {/* Dimensões Calculadas - Read-only */}
                      <div className="mt-2 p-2.5 bg-purple-950/30 border border-purple-800/30 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-purple-300/70">Grid Total:</span>
                          <span className="text-zinc-400 font-mono text-[9px]">
                            {gridWidth.toFixed(1)}×{gridHeight.toFixed(1)}cm
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-purple-300">Imagem Escalada:</span>
                          <span className="text-purple-400 font-mono font-bold">
                            {tattooWidth.toFixed(1)}cm × {tattooHeight.toFixed(1)}cm
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-purple-300/70">Layout:</span>
                          <span className="text-emerald-400 font-mono font-semibold">
                            {cols} × {rows} = {numA4s} A4{numA4s > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-[9px] text-purple-400/60 italic pt-1 border-t border-purple-800/20">
                          ✓ Proporção mantida • Cabe em {((tattooWidth * tattooHeight) / (gridWidth * gridHeight) * 100).toFixed(0)}% do grid
                        </div>
                      </div>
                    </div>

                    {/* Overlap */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">
                        Overlap: {overlapCm.toFixed(1)} cm
                      </label>
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
                        className="w-full"
                      />
                    </div>

                    {/* Process Mode */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Processamento</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            setProcessMode('reference');
                            setSplitResult(null);
                          }}
                          className={`p-2 rounded text-[10px] font-medium transition-all ${
                            processMode === 'reference'
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          🖼️ Original
                        </button>
                        <button
                          onClick={() => {
                            setProcessMode('topographic');
                            setSplitResult(null);
                          }}
                          className={`p-2 rounded text-[10px] font-medium transition-all ${
                            processMode === 'topographic'
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          🗺️ Topo
                        </button>
                        <button
                          onClick={() => {
                            setProcessMode('perfect_lines');
                            setSplitResult(null);
                          }}
                          className={`p-2 rounded text-[10px] font-medium transition-all ${
                            processMode === 'perfect_lines'
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
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
                  disabled={isProcessing || (activeMode === 'ENHANCE' && !!resultImage) || (activeMode === 'COLOR_MATCH' && !!colorResult) || (activeMode === 'SPLIT_A4' && !!splitResult)}
                  className={`mt-3 lg:mt-4 w-full py-2.5 lg:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm lg:text-base ${
                    isProcessing
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : activeMode === 'ENHANCE'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                        : activeMode === 'COLOR_MATCH'
                          ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/20'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'
                  }`}
                >
                  {isProcessing ? <LoadingSpinner /> : (
                    <>
                      {activeMode === 'ENHANCE' ? <Wand2 size={18} /> : activeMode === 'COLOR_MATCH' ? <Palette size={18} /> : <Grid3x3 size={18} />}
                      {activeMode === 'ENHANCE' ? 'Aprimorar Agora' : activeMode === 'COLOR_MATCH' ? 'Identificar Tintas' : 'Dividir em A4s'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Output Area */}
          <div className="lg:flex-1 p-4 lg:p-8 bg-zinc-950/30 flex flex-col min-h-[300px] lg:min-h-0">
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
                    <LoadingSpinner text={activeMode === 'COLOR_MATCH' ? "Consultando catálogo..." : activeMode === 'SPLIT_A4' ? "Dividindo imagem..." : "Processando..."} />
                  </div>
                ) : (
                  <>
                    <ArrowRight size={28} className="mb-4 opacity-50" />
                    <p className="text-sm">O resultado aparecerá aqui</p>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col animate-in fade-in duration-500">
                
                {/* Result for Enhance Mode */}
                {activeMode === 'ENHANCE' && resultImage && (
                  <>
                    <div className="flex justify-between items-center mb-3 lg:mb-4">
                      <h3 className="text-blue-400 font-medium text-sm flex items-center gap-2">
                        <Wand2 size={16} /> Resultado Aprimorado
                      </h3>
                      <a href={resultImage} download="enhanced-image.png" className="text-zinc-400 hover:text-white text-xs flex items-center gap-1">
                        <Download size={14} /> Baixar
                      </a>
                    </div>
                    <div className="flex-1 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] rounded-xl flex items-center justify-center p-2 lg:p-4 overflow-hidden">
                      <img src={resultImage} alt="Enhanced" className="max-w-full max-h-[250px] lg:max-h-[400px] object-contain rounded shadow-2xl" />
                    </div>
                  </>
                )}

                {/* Result for Color Match Mode */}
                {activeMode === 'COLOR_MATCH' && colorResult && (
                  <div className="h-full flex flex-col">
                    <div className="mb-4 lg:mb-6">
                      <h3 className="text-pink-400 font-medium text-base lg:text-lg mb-1 flex items-center gap-2">
                        <Palette size={18} /> Tintas Recomendadas
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <p className="text-zinc-400 text-xs lg:text-sm italic pr-2">"{colorResult.summary}"</p>
                        <span className="text-[10px] bg-pink-900/30 text-pink-300 border border-pink-800 px-2 py-1 rounded whitespace-nowrap self-start sm:self-auto">
                          {selectedBrand}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 lg:space-y-3">
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

                    <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-600 text-center">
                        * Sugestões aproximadas. O tom real pode variar.
                      </p>
                    </div>
                  </div>
                )}

                {/* Result for Split A4 Mode */}
                {activeMode === 'SPLIT_A4' && splitResult && (
                  <div className="h-full flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-purple-400 font-medium text-base lg:text-lg mb-1 flex items-center gap-2">
                        <Grid3x3 size={18} /> Divisão em A4s
                      </h3>
                      <div className="space-y-1">
                        <p className="text-zinc-400 text-xs">
                          {splitResult.pages?.length || 0} folha(s) A4 · Grid {splitResult.gridInfo?.cols || 0} × {splitResult.gridInfo?.rows || 0}
                        </p>
                        <p className="text-zinc-500 text-[10px]">
                          ✓ Proporção mantida · {offsetX > 0 || offsetY > 0 ? `Deslocado ${offsetX}cm × ${offsetY}cm` : 'Centralizado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                      <div className="grid grid-cols-2 gap-2 lg:gap-3">
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

                    <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-zinc-600">
                          * Imprima em {paperSize} {orientation === 'portrait' ? 'retrato' : 'paisagem'} sem margens
                        </p>
                        <button
                          onClick={() => {
                            splitResult.pages?.forEach((page: any) => {
                              const link = document.createElement('a');
                              link.href = page.imageData;
                              link.download = `page-${page.pageNumber}-${paperSize.toLowerCase()}.png`;
                              link.click();
                            });
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                        >
                          <Download size={14} />
                          Baixar {splitResult.pages?.length} Páginas
                        </button>
                      </div>
                      {overlapCm > 0 && (
                        <div className="bg-purple-900/20 border border-purple-800/30 rounded p-2 text-[10px] text-purple-300">
                          💡 <strong>{overlapCm}cm de overlap</strong> entre páginas para facilitar a colagem/alinhamento
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
