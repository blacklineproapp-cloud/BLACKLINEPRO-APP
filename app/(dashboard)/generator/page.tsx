'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import { storage } from '@/lib/client-storage';
import { Sparkles, Download, MoveRight, FileOutput, Settings, ChevronUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ImageSize = 'A4' | 'A3' | '1K' | '2K' | '4K';
type TattooStyle = 'blackwork' | 'fineline' | 'neo_traditional' | 'realism' | 'dotwork' | 'old_school';

// Estilos com prompts otimizados para qualidade
const TATTOO_STYLES: Record<TattooStyle, { name: string; icon: string; promptSuffix: string }> = {
  blackwork: {
    name: 'Blackwork',
    icon: '⬛',
    promptSuffix: 'blackwork tattoo style, solid black ink, bold geometric shapes, high contrast, no shading gradients, vector-like clean lines'
  },
  fineline: {
    name: 'Fine Line',
    icon: '✒️',
    promptSuffix: 'fine line tattoo style, delicate thin lines, minimal shading, elegant detailed linework, single needle aesthetic'
  },
  neo_traditional: {
    name: 'Neo Trad',
    icon: '🌹',
    promptSuffix: 'neo traditional tattoo style, bold outlines, vibrant colors, modern interpretation of classic tattoo art, decorative elements'
  },
  realism: {
    name: 'Realismo',
    icon: '📷',
    promptSuffix: 'realistic tattoo style, photorealistic details, smooth gradients, lifelike shading, high detail portrait quality'
  },
  dotwork: {
    name: 'Dotwork',
    icon: '•••',
    promptSuffix: 'dotwork tattoo style, stippling technique, geometric patterns, mandala elements, dots creating shading and texture'
  },
  old_school: {
    name: 'Old School',
    icon: '⚓',
    promptSuffix: 'american traditional tattoo style, bold black outlines, limited color palette, classic sailor tattoo iconography, vintage flash art'
  },
};

// Composições/Regiões do corpo
type Composition = 'free' | 'arm' | 'chest' | 'back' | 'leg' | 'ribs';

const COMPOSITIONS: Record<Composition, { name: string; icon: string; hint: string }> = {
  free: { name: 'Livre', icon: '✨', hint: 'Sem restrição de formato' },
  arm: { name: 'Braço', icon: '💪', hint: 'Alongado, design vertical' },
  chest: { name: 'Peito', icon: '👔', hint: 'Design amplo e centrado' },
  back: { name: 'Costa', icon: '🦴', hint: 'Canvas grande, detalhado' },
  leg: { name: 'Perna', icon: '🦵', hint: 'Longo, envolve a curva' },
  ribs: { name: 'Costela', icon: '↔️', hint: 'Vertical alongado' },
};

export default function GeneratorPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize>('A4');
  const [selectedStyle, setSelectedStyle] = useState<TattooStyle | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedComposition, setSelectedComposition] = useState<Composition>('free');

  // Carregar histórico do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('stencilflow_prompt_history');
    if (savedHistory) {
      setPromptHistory(JSON.parse(savedHistory));
    }
    // Sempre iniciar com controles abertos (especialmente importante no mobile)
    setShowControls(true);
  }, []);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    // No mobile, manter painel aberto para feedback visual
    if (window.innerWidth >= 1024) {
      setShowControls(false); // Esconder controles durante geração apenas no desktop
    }
    
    // Construir prompt completo
    let fullPrompt = prompt;
    
    // Adicionar estilo
    if (selectedStyle) {
      fullPrompt += `, ${TATTOO_STYLES[selectedStyle].promptSuffix}`;
    }
    
    // Adicionar composição/região
    if (selectedComposition !== 'free') {
      const comp = COMPOSITIONS[selectedComposition];
      fullPrompt += `, designed for ${comp.name.toLowerCase()} placement, ${comp.hint.toLowerCase()}`;
    }
    
    // Adicionar negative prompt
    if (negativePrompt.trim()) {
      fullPrompt += `. Avoid: ${negativePrompt.trim()}`;
    }
    
    try {
      const res = await fetch('/api/stencil/generate-idea', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, size }),
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedImage(data.image);
        
        // Salvar prompt no histórico (máximo 10)
        const trimmedPrompt = prompt.trim();
        if (trimmedPrompt) {
          const newHistory = [trimmedPrompt, ...promptHistory.filter(p => p !== trimmedPrompt)].slice(0, 10);
          setPromptHistory(newHistory);
          localStorage.setItem('stencilflow_prompt_history', JSON.stringify(newHistory));
        }
      } else if (data.requiresSubscription) {
        setError(data.message || 'Este recurso requer um plano pago.');
        setTimeout(() => {
          window.location.href = '/pricing';
        }, 2000);
      } else {
        setError(data.error || 'Falha ao gerar imagem.');
        setShowControls(true);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar imagem.');
      setShowControls(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAsBase = async () => {
    if (generatedImage) {
      // Limpar cache de projeto do Dashboard para evitar conflito
      await storage.remove('edit_project');
      // Salvar imagem gerada
      await storage.set('generated_image', generatedImage);
      router.push('/editor');
    }
  };

  const reset = () => {
    setGeneratedImage(null);
    setPrompt('');
    setError(null);
    setSelectedStyle(null);
    setSelectedComposition('free');
    setNegativePrompt('');
    setShowControls(true);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        
        {/* Canvas Area */}
        <main className="flex-1 bg-zinc-950 flex items-center justify-center p-3 lg:p-6 min-h-[50vh] lg:min-h-0">
          
          {/* Empty State */}
          {!generatedImage && !loading && (
            <div className="text-center">
              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-zinc-800">
                <Sparkles className="text-zinc-700" size={32} />
              </div>
              <p className="text-zinc-600 font-medium text-sm lg:text-base">Sua arte aparecerá aqui</p>
              <p className="text-zinc-700 text-xs mt-1">Descreva sua ideia no painel</p>
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="text-center">
              <LoadingSpinner size="lg" showSteps mode="image" />
            </div>
          )}
          
          {/* Generated Image */}
          {generatedImage && !loading && (
            <div className="relative w-full h-[45vh] lg:h-[70vh]">
              <Image 
                src={generatedImage} 
                alt="Generated Art" 
                fill
                className="object-contain rounded-lg shadow-2xl"
                unoptimized
              />
            </div>
          )}
        </main>

        {/* MOBILE: Botão flutuante para abrir painel quando fechado */}
        {!showControls && !generatedImage && (
          <button
            onClick={() => setShowControls(true)}
            className="lg:hidden fixed bottom-20 right-4 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg z-50"
          >
            <ChevronUp size={20} />
          </button>
        )}

        {/* MOBILE: Barra de ações fixa quando imagem está gerada */}
        {generatedImage && !loading && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 p-3">
            <div className="flex gap-2">
              <a
                href={generatedImage}
                download={`stencilflow-${Date.now()}.png`}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={18} /> Baixar
              </a>
              <button
                onClick={handleUseAsBase}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <FileOutput size={18} /> Criar Stencil
              </button>
              <button
                onClick={reset}
                className="w-14 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white py-3 rounded-xl flex items-center justify-center"
                title="Nova Geração"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}


        {/* Controls Panel - Esconde no mobile quando imagem está gerada */}
        <aside className={`
          ${showControls && !generatedImage ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
          fixed lg:relative bottom-0 left-0 right-0
          lg:w-72 xl:w-80
          bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800
          transition-transform duration-300 ease-out
          z-40 shadow-2xl lg:shadow-none
          lg:max-h-none
          rounded-t-2xl lg:rounded-none
        `}>
          {/* Drag handle - Clicável para abrir/fechar */}
          <div
            onClick={() => setShowControls(!showControls)}
            className="lg:hidden flex justify-center pt-3 pb-2 cursor-pointer active:bg-zinc-800/50 transition-colors"
          >
            <div className="w-12 h-1 bg-zinc-600 rounded-full"></div>
          </div>

          <div className="p-3 lg:p-5 space-y-2.5 lg:space-y-3 max-h-[calc(100vh-8rem)] lg:max-h-none overflow-y-auto pb-24 lg:pb-5">
            
            {/* Before Generation */}
            {!generatedImage && (
              <>
                <div>
                  <h3 className="text-white font-medium text-[11px] mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={11} className="text-amber-400" />
                    Descreva sua Ideia
                  </h3>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Caveira mexicana com rosas..."
                    className="w-full h-16 lg:h-20 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs lg:text-sm text-white placeholder-zinc-600 focus:border-indigo-500 outline-none resize-none"
                  />
                  
                  {/* Histórico de Prompts */}
                  {promptHistory.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] text-zinc-500 hover:text-indigo-400 flex items-center gap-1 mt-1 transition-colors"
                      >
                        <ChevronUp size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                        Histórico ({promptHistory.length})
                      </button>
                      
                      {showHistory && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-32 overflow-y-auto">
                          {promptHistory.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setPrompt(p);
                                setShowHistory(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white border-b border-zinc-800 last:border-0 truncate transition-colors"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Estilos de Tattoo */}
                <div>
                  <label className="text-[9px] text-zinc-500 font-medium block mb-1.5">Estilo (opcional)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(TATTOO_STYLES) as TattooStyle[]).map((styleKey) => {
                      const style = TATTOO_STYLES[styleKey];
                      const isSelected = selectedStyle === styleKey;
                      return (
                        <button
                          key={styleKey}
                          onClick={() => setSelectedStyle(isSelected ? null : styleKey)}
                          className={`py-2 px-2 rounded-lg text-[10px] font-medium border transition-all flex flex-col items-center gap-0.5 ${
                            isSelected
                              ? 'bg-indigo-900/40 border-indigo-500 text-indigo-300'
                              : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          <span className="text-sm">{style.icon}</span>
                          <span>{style.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedStyle && (
                    <p className="text-[9px] text-indigo-400 mt-1.5 flex items-center gap-1">
                      ✨ {TATTOO_STYLES[selectedStyle].name} aplicado
                    </p>
                  )}
                </div>

                {/* Composição / Região do Corpo */}
                <div>
                  <label className="text-[9px] text-zinc-500 font-medium block mb-1.5">Região do Corpo</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(COMPOSITIONS) as Composition[]).map((compKey) => {
                      const comp = COMPOSITIONS[compKey];
                      const isSelected = selectedComposition === compKey;
                      return (
                        <button
                          key={compKey}
                          onClick={() => setSelectedComposition(compKey)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-all flex items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                              : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                          title={comp.hint}
                        >
                          <span>{comp.icon}</span>
                          <span>{comp.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedComposition !== 'free' && (
                    <p className="text-[9px] text-purple-400 mt-1">
                      📐 {COMPOSITIONS[selectedComposition].hint}
                    </p>
                  )}
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="text-[9px] text-zinc-500 font-medium block mb-1">Evitar (opcional)</label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Ex: cores, fundo, texto..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 font-medium block mb-1">Tamanho (Alta Qualidade)</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['A4', 'A3', '1K', '2K', '4K'] as ImageSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          size === s
                            ? 'bg-indigo-900/30 border-indigo-500 text-indigo-400'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-1">
                    {size === 'A4' && '21×29.7cm @ 300 DPI (impressão profissional)'}
                    {size === 'A3' && '29.7×42cm @ 300 DPI (impressão profissional)'}
                    {size === '1K' && '1024×1024px'}
                    {size === '2K' && '2048×2048px'}
                    {size === '4K' && '4096×4096px'}
                  </p>
                </div>

                {error && (
                  <p className="text-red-400 text-[10px] text-center bg-red-900/20 p-2 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 lg:py-3 rounded-xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-900/30"
                >
                  <Sparkles size={14} />
                  Gerar Design
                </button>
              </>
            )}
            
            {/* After Generation */}
            {generatedImage && (
              <>
                <div className="p-3 rounded-xl border bg-amber-900/20 border-amber-800">
                  <p className="text-xs text-amber-300">
                    ✓ Arte gerada! Use os botões no header para baixar ou criar estêncil.
                  </p>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleUseAsBase}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    <FileOutput size={16} /> Criar Estêncil
                    <MoveRight size={16} />
                  </button>
                  
                  <a 
                    href={generatedImage} 
                    download={`stencilflow-${Date.now()}.png`}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <Download size={14} /> Baixar PNG
                  </a>
                </div>

                <button 
                  onClick={reset}
                  className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm font-medium"
                >
                  ← Gerar outra ideia
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
