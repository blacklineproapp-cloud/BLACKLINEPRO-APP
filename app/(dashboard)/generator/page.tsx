'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Sparkles, Download, MoveRight, FileOutput, Settings, ChevronUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ImageSize = 'A4' | 'A3' | '1K' | '2K' | '4K';

export default function GeneratorPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize>('A4');
  const [showControls, setShowControls] = useState(true);

  // Garantir que controles estejam visíveis ao iniciar
  useEffect(() => {
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
    
    try {
      const res = await fetch('/api/stencil/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size }),
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedImage(data.image);
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

  const handleUseAsBase = () => {
    if (generatedImage) {
      sessionStorage.setItem('stencilflow_generated_image', generatedImage);
      router.push('/editor');
    }
  };

  const reset = () => {
    setGeneratedImage(null);
    setPrompt('');
    setError(null);
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
              <LoadingSpinner text="Gerando arte com IA..." />
            </div>
          )}
          
          {/* Generated Image */}
          {generatedImage && !loading && (
            <div className="relative">
              <img 
                src={generatedImage} 
                alt="Generated Art" 
                className="max-w-full max-h-[45vh] lg:max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
        </main>

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
