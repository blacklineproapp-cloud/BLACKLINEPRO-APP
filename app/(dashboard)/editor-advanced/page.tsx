'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StencilAdjustControls from '@/components/editor/StencilAdjustControls';
import { RotateCcw, Save, Download, Image as ImageIcon, X, Zap, PenTool, Layers, ScanLine, ChevronUp, Ruler, Undo, Redo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { DEFAULT_ADJUST_CONTROLS, type AdjustControls } from '@/lib/stencil-types';
import { applyAdjustments, applyPreset, resetControls } from '@/lib/stencil-adjustments';

type Style = 'standard' | 'perfect_lines';
type ComparisonMode = 'wipe' | 'overlay';

export default function EditorAdvancedPage() {
  const router = useRouter();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedStencil, setGeneratedStencil] = useState<string | null>(null);
  const [adjustedStencil, setAdjustedStencil] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<Style>('standard');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('overlay');
  const [showControls, setShowControls] = useState(true);

  // Tamanho
  const [widthCm, setWidthCm] = useState(15);
  const [heightCm, setHeightCm] = useState(15);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Controles de ajuste
  const [adjustControls, setAdjustControls] = useState<AdjustControls>(DEFAULT_ADJUST_CONTROLS);

  // Histórico (Undo/Redo)
  const history = useEditorHistory();

  // Seções expansíveis (mobile)
  const [showSizeSection, setShowSizeSection] = useState(false);
  const [showModeSection, setShowModeSection] = useState(false);
  const [showAdjustSection, setShowAdjustSection] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Imagem atual para exibir (ajustada ou gerada)
  const currentStencil = adjustedStencil || generatedStencil;

  // Load image from sessionStorage
  useEffect(() => {
    const editProject = sessionStorage.getItem('stencilflow_edit_project');
    if (editProject) {
      try {
        const project = JSON.parse(editProject);
        setOriginalImage(project.original_image);
        setGeneratedStencil(project.stencil_image);
        setSelectedStyle(project.style || 'standard');
        if (project.width_cm) setWidthCm(project.width_cm);
        if (project.height_cm) setHeightCm(project.height_cm);
        if (project.prompt_details) setPromptText(project.prompt_details);
        sessionStorage.removeItem('stencilflow_edit_project');
        setShowControls(true);

        // Inicializar histórico com imagem carregada
        if (project.stencil_image) {
          history.pushState(project.stencil_image, DEFAULT_ADJUST_CONTROLS);
        }
        return;
      } catch (e) {
        console.error('Erro ao carregar projeto:', e);
      }
    }

    const savedImage = sessionStorage.getItem('stencilflow_generated_image');
    if (savedImage) {
      setOriginalImage(savedImage);
      sessionStorage.removeItem('stencilflow_generated_image');
      setShowControls(true);
    }

    if (window.innerWidth >= 1024) {
      setShowControls(true);
    }
  }, []);

  // Calculate height based on aspect ratio
  useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.src = originalImage;
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        setAspectRatio(ratio);
        setHeightCm(Number((widthCm / ratio).toFixed(1)));
      };
    }
  }, [widthCm, originalImage]);

  // Keyboard shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z ou Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Y ou Cmd+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }

      // R = Reset ajustes
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        handleResetAdjustments();
      }

      // I = Inverter
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
        setAdjustControls(prev => ({ ...prev, invert: !prev.invert }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjustedStencil, generatedStencil]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOriginalImage(ev.target?.result as string);
        setGeneratedStencil(null);
        setAdjustedStencil(null);
        setComparisonMode('overlay');
        setSliderPosition(50);
        setShowControls(true);
        history.clear();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setGeneratedStencil(null);
    setAdjustedStencil(null);
    setIsProcessing(true);

    if (window.innerWidth >= 1024) {
      setShowControls(false);
    }

    try {
      const res = await fetch('/api/stencil/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImage,
          style: selectedStyle,
          promptDetails: promptText,
          widthCm,
          heightCm,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedStencil(data.image);
        setSliderPosition(100);
        setComparisonMode('overlay');

        // Adicionar ao histórico
        history.clear();
        history.pushState(data.image, DEFAULT_ADJUST_CONTROLS);

        // Resetar controles
        setAdjustControls(DEFAULT_ADJUST_CONTROLS);

        // Auto-save
        autoSaveProject(data.image);
      } else if (data.requiresSubscription) {
        if (confirm(`${data.message}\n\nDeseja assinar agora?`)) {
          window.location.href = '/api/payments/create-checkout?plan=' + data.subscriptionType;
        }
        setShowControls(true);
      } else {
        alert(data.error || 'Erro ao gerar estêncil.');
        setShowControls(true);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar estêncil.');
      setShowControls(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Aplicar ajustes com debounce
  const applyAdjustmentsDebounced = useCallback((controls: AdjustControls) => {
    if (!generatedStencil) return;

    // Cancelar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Criar novo timer (300ms de debounce)
    debounceTimerRef.current = setTimeout(async () => {
      setIsAdjusting(true);

      try {
        const adjusted = await applyAdjustments(generatedStencil, controls);
        setAdjustedStencil(adjusted);

        // Adicionar ao histórico
        history.pushState(adjusted, controls);
      } catch (error: any) {
        console.error('Erro ao aplicar ajustes:', error);
        alert('Erro ao aplicar ajustes: ' + error.message);
      } finally {
        setIsAdjusting(false);
      }
    }, 300);
  }, [generatedStencil, history]);

  // Handler de mudança de controles
  const handleAdjustChange = (newControls: AdjustControls) => {
    setAdjustControls(newControls);
    applyAdjustmentsDebounced(newControls);
  };

  // Reset de ajustes
  const handleResetAdjustments = () => {
    const controls = resetControls();
    setAdjustControls(controls);
    setAdjustedStencil(null);
  };

  // Aplicar preset
  const handleApplyPreset = (presetKey: string) => {
    const newControls = applyPreset(adjustControls, presetKey);
    handleAdjustChange(newControls);
  };

  // Undo
  const handleUndo = () => {
    if (!history.canUndo) return;

    const previousState = history.undo();
    if (previousState) {
      setAdjustedStencil(previousState.image);
      setAdjustControls(previousState.controls);
    }
  };

  // Redo
  const handleRedo = () => {
    if (!history.canRedo) return;

    const nextState = history.redo();
    if (nextState) {
      setAdjustedStencil(nextState.image);
      setAdjustControls(nextState.controls);
    }
  };

  const autoSaveProject = async (stencilImage: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Estêncil ${new Date().toLocaleTimeString()}`,
          originalImage,
          stencilImage,
          style: selectedStyle,
          widthCm,
          heightCm,
          promptDetails: promptText,
        }),
      });

      if (res.ok) {
        console.log('Projeto salvo automaticamente');
      }
    } catch (error) {
      console.error('Erro ao auto-salvar:', error);
    }
  };

  const handleSave = async () => {
    if (!currentStencil || !originalImage) return;

    const name = prompt('Nome do projeto:') || `Estêncil ${new Date().toLocaleTimeString()}`;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          originalImage,
          stencilImage: currentStencil,
          style: selectedStyle,
          widthCm,
          heightCm,
          promptDetails: promptText,
        }),
      });

      if (res.ok) {
        alert('Salvo!');
        router.push('/dashboard');
      } else {
        alert('Erro ao salvar');
      }
    } catch (error) {
      alert('Erro ao salvar');
    }
  };

  const handleDownload = async () => {
    if (!currentStencil) return;
    const fileName = `stencil-${widthCm}x${heightCm}cm-${Date.now()}.png`;

    try {
      const response = await fetch(currentStencil);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const link = document.createElement('a');
      link.href = currentStencil;
      link.download = fileName;
      link.click();
    }
  };

  const handleReset = () => {
    setGeneratedStencil(null);
    setAdjustedStencil(null);
    setPromptText('');
    setSliderPosition(50);
    setShowControls(true);
    setAdjustControls(DEFAULT_ADJUST_CONTROLS);
    history.clear();
  };

  const handleNewUpload = () => {
    setOriginalImage(null);
    setGeneratedStencil(null);
    setAdjustedStencil(null);
    setPromptText('');
    setSliderPosition(50);
    setShowControls(false);
    setWidthCm(15);
    setHeightCm(15);
    setAdjustControls(DEFAULT_ADJUST_CONTROLS);
    history.clear();
  };

  const applyPresetSize = (preset: string) => {
    switch(preset) {
      case 'A4':
        setWidthCm(21);
        break;
      case 'A3':
        setWidthCm(29.7);
        break;
      case 'Retrato':
        setWidthCm(10);
        break;
      case 'Quadrado':
        setWidthCm(15);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">

        {/* Canvas Area */}
        <main className="flex-1 bg-zinc-950 flex items-center justify-center p-3 lg:p-6 min-h-[50vh] lg:min-h-0">

          {/* Upload State */}
          {!originalImage && (
            <div className="text-center">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-40 h-40 lg:w-56 lg:h-56 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center text-zinc-500 hover:text-emerald-500 hover:border-emerald-500 transition-all bg-zinc-900/50"
              >
                <ImageIcon size={36} className="mb-3" />
                <span className="font-medium text-sm">Carregar Imagem</span>
              </button>
            </div>
          )}

          {/* Processing State */}
          {originalImage && isProcessing && (
            <LoadingSpinner text={selectedStyle === 'perfect_lines' ? "Mapeando tons..." : "Mapeando topografia..."} />
          )}

          {/* Original Image (before generation) */}
          {originalImage && !isProcessing && !currentStencil && (
            <img src={originalImage} alt="Original" className="max-w-full max-h-[45vh] lg:max-h-[70vh] object-contain shadow-2xl rounded-lg" />
          )}

          {/* Comparison View (after generation) */}
          {originalImage && !isProcessing && currentStencil && (
            <div className="relative select-none shadow-2xl rounded-lg overflow-hidden bg-white max-w-full max-h-[45vh] lg:max-h-[70vh]">
              {/* Mode Toggle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-zinc-700 rounded-full p-0.5 flex gap-0.5 shadow-xl">
                <button
                  onClick={() => setComparisonMode('wipe')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                    comparisonMode === 'wipe' ? 'bg-emerald-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  <ScanLine size={10} /> Wipe
                </button>
                <button
                  onClick={() => setComparisonMode('overlay')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                    comparisonMode === 'overlay' ? 'bg-emerald-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  <Layers size={10} /> Blend
                </button>
              </div>

              {/* Undo/Redo Buttons */}
              {generatedStencil && (
                <div className="absolute top-2 right-2 z-50 flex gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={!history.canUndo || isAdjusting}
                    className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-1.5 text-zinc-400 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Desfazer (Ctrl+Z)"
                  >
                    <Undo size={14} />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!history.canRedo || isAdjusting}
                    className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-1.5 text-zinc-400 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Refazer (Ctrl+Y)"
                  >
                    <Redo size={14} />
                  </button>
                </div>
              )}

              {/* Background (Original) */}
              <img
                src={originalImage}
                alt="Original"
                className="block max-w-full max-h-[45vh] lg:max-h-[70vh] object-contain"
                draggable={false}
                style={{ opacity: comparisonMode === 'overlay' ? 0.5 : 1 }}
              />

              {/* Foreground (Stencil) */}
              <div
                className="absolute inset-0 bg-white"
                style={{
                  clipPath: comparisonMode === 'wipe' ? `inset(0 ${100 - sliderPosition}% 0 0)` : 'none',
                  mixBlendMode: comparisonMode === 'overlay' ? 'multiply' : 'normal',
                  opacity: comparisonMode === 'overlay' ? sliderPosition / 100 : 1
                }}
              >
                <img src={currentStencil} alt="Stencil" className="w-full h-full object-contain" draggable={false} />
              </div>

              {/* Wipe handle */}
              {comparisonMode === 'wipe' && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 z-20" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="flex gap-px"><div className="w-px h-2 bg-white/80"></div><div className="w-px h-2 bg-white/80"></div></div>
                  </div>
                </div>
              )}

              <input type="range" min="0" max="100" value={sliderPosition} onChange={(e) => setSliderPosition(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" />

              {/* Processing overlay */}
              {isAdjusting && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
                  <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-sm">Aplicando ajustes...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* MOBILE: Barra de ações fixa */}
        {currentStencil && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 p-3">
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={18} /> Baixar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} /> Salvar
              </button>
              <button
                onClick={handleNewUpload}
                className="w-14 bg-red-900/50 hover:bg-red-800 text-red-400 hover:text-white py-3 rounded-xl flex items-center justify-center border border-red-800"
                title="Nova Imagem"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Controls Panel */}
        <aside className={`
          ${showControls && !currentStencil ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
          fixed lg:relative bottom-0 left-0 right-0 lg:w-72 xl:w-80
          bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800
          transition-transform duration-300 z-40 shadow-2xl lg:shadow-none
          lg:max-h-none max-h-[60vh] rounded-t-2xl lg:rounded-none
        `}>
          {/* Drag handle */}
          <div
            onClick={() => setShowControls(!showControls)}
            className="lg:hidden flex justify-center pt-3 pb-2 cursor-pointer active:bg-zinc-800/50 transition-colors"
          >
            <div className="w-12 h-1 bg-zinc-600 rounded-full"></div>
          </div>

          <div className="p-2.5 lg:p-5 space-y-2 lg:space-y-3 overflow-y-auto pb-20 lg:pb-5 max-h-[calc(100vh-80px)]">

            {/* Botão Nova Imagem */}
            {originalImage && !currentStencil && (
              <button
                onClick={handleNewUpload}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-xl font-medium flex items-center justify-center gap-2 text-sm border border-zinc-700"
              >
                <X size={14} /> Nova Imagem
              </button>
            )}

            {/* TAMANHO */}
            {!currentStencil && originalImage && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowSizeSection(!showSizeSection)}
                  className="w-full p-2 flex items-center justify-between lg:cursor-default"
                >
                  <h3 className="text-white font-medium text-[11px] flex items-center gap-1.5">
                    <Ruler size={11} className="text-amber-400" /> Tamanho
                  </h3>
                  <ChevronUp size={14} className={`lg:hidden text-zinc-500 transition-transform ${showSizeSection ? 'rotate-180' : ''}`} />
                </button>

                <div className={`${showSizeSection ? 'block' : 'hidden'} lg:block px-2 pb-2`}>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {['A4', 'A3', 'Retrato', 'Quadrado'].map((preset) => (
                      <button key={preset} onClick={() => applyPresetSize(preset)} className="py-1 rounded text-[9px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-700">
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-zinc-500 block mb-0.5">Largura (cm)</label>
                      <input type="number" value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-white text-xs focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 block mb-0.5">Altura (cm)</label>
                      <input type="number" value={heightCm} readOnly className="w-full bg-zinc-900/50 border border-zinc-700 rounded p-1.5 text-zinc-500 text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODO */}
            {!currentStencil && (
              <>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <button onClick={() => setShowModeSection(!showModeSection)} className="w-full p-2 flex items-center justify-between lg:cursor-default">
                    <h3 className="text-white font-medium text-[11px] flex items-center gap-1.5">
                      <Zap size={11} className="text-emerald-500" /> Modo
                    </h3>
                    <ChevronUp size={14} className={`lg:hidden text-zinc-500 transition-transform ${showModeSection ? 'rotate-180' : ''}`} />
                  </button>

                  <div className={`${showModeSection ? 'block' : 'hidden'} lg:block px-2 pb-2`}>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => setSelectedStyle('perfect_lines')} className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium ${selectedStyle === 'perfect_lines' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                        <Zap size={16} className="mb-1" /> Topográfico
                      </button>
                      <button onClick={() => setSelectedStyle('standard')} className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium ${selectedStyle === 'standard' ? 'bg-purple-900/30 border-purple-500 text-purple-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                        <PenTool size={16} className="mb-1" /> Linhas
                      </button>
                    </div>
                  </div>
                </div>

                <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder="Instruções extras..." className="w-full h-10 lg:h-14 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs lg:text-sm text-white placeholder-zinc-600 focus:border-emerald-600 outline-none resize-none" />

                <button
                  onClick={handleGenerate}
                  disabled={isProcessing || !originalImage}
                  className={`w-full py-2.5 lg:py-3 rounded-xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 disabled:opacity-50 ${
                    selectedStyle === 'perfect_lines'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
                  }`}
                >
                  {selectedStyle === 'perfect_lines' ? <Zap size={14} /> : <PenTool size={14} />}
                  Gerar Estêncil
                </button>
              </>
            )}

            {/* AJUSTES (após gerar) */}
            {generatedStencil && (
              <>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <button onClick={() => setShowAdjustSection(!showAdjustSection)} className="w-full p-2 flex items-center justify-between">
                    <h3 className="text-white font-medium text-xs">Ajustes Avançados</h3>
                    <ChevronUp size={14} className={`text-zinc-500 transition-transform ${showAdjustSection ? 'rotate-180' : ''}`} />
                  </button>

                  {showAdjustSection && (
                    <div className="px-2 pb-2">
                      <StencilAdjustControls
                        controls={adjustControls}
                        onChange={handleAdjustChange}
                        onReset={handleResetAdjustments}
                        onApplyPreset={handleApplyPreset}
                        isProcessing={isAdjusting}
                      />
                    </div>
                  )}
                </div>

                <button onClick={handleReset} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-xl font-medium flex items-center justify-center gap-2 text-sm">
                  <RotateCcw size={14} /> Gerar Novo
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
