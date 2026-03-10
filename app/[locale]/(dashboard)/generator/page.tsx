'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import { storage } from '@/lib/client-storage';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Download, MoveRight, FileOutput, Settings, ChevronUp, X, Upload,
  Square, Feather, Flower2, Camera, CircleDot, Anchor,
  Dumbbell, Shirt, Bone, Footprints, MoveHorizontal, Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApiKey } from '@/hooks/useApiKey';
import ApiKeySetupModal from '@/components/ApiKeySetupModal';
import AnonymousBanner from '@/components/AnonymousBanner';
import AdSlot from '@/components/AdSlot';
import GeneratingAdOverlay from '@/components/GeneratingAdOverlay';
import { useUser } from '@clerk/nextjs';

type ImageSize = 'A4' | 'A3' | '1K' | '2K' | '4K';
type TattooStyle = 'blackwork' | 'fineline' | 'neo_traditional' | 'realism' | 'dotwork' | 'old_school';

// Estilos com prompts otimizados para qualidade (em inglês para melhor resultado da IA)
const TATTOO_STYLES: Record<TattooStyle, { icon: ReactNode; promptSuffix: string }> = {
  blackwork: {
    icon: <Square size={18} />,
    promptSuffix: 'blackwork tattoo style, solid black ink, bold geometric shapes, high contrast, no shading gradients, vector-like clean lines'
  },
  fineline: {
    icon: <Feather size={18} />,
    promptSuffix: 'fine line tattoo style, delicate thin lines, minimal shading, elegant detailed linework, single needle aesthetic'
  },
  neo_traditional: {
    icon: <Flower2 size={18} />,
    promptSuffix: 'neo traditional tattoo style, bold outlines, vibrant colors, modern interpretation of classic tattoo art, decorative elements'
  },
  realism: {
    icon: <Camera size={18} />,
    promptSuffix: 'realistic tattoo style, photorealistic details, smooth gradients, lifelike shading, high detail portrait quality'
  },
  dotwork: {
    icon: <CircleDot size={18} />,
    promptSuffix: 'dotwork tattoo style, stippling technique, geometric patterns, mandala elements, dots creating shading and texture'
  },
  old_school: {
    icon: <Anchor size={18} />,
    promptSuffix: 'american traditional tattoo style, bold black outlines, limited color palette, classic sailor tattoo iconography, vintage flash art'
  },
};

// Composições/Regiões do corpo
type Composition = 'free' | 'arm' | 'chest' | 'back' | 'leg' | 'ribs';

const COMPOSITIONS: Record<Composition, { icon: ReactNode; promptName: string }> = {
  free: { icon: <Sparkles size={18} />, promptName: 'free composition' },
  arm: { icon: <Dumbbell size={18} />, promptName: 'arm placement, elongated vertical design' },
  chest: { icon: <Shirt size={18} />, promptName: 'chest placement, wide centered design' },
  back: { icon: <Bone size={18} />, promptName: 'back placement, large detailed canvas' },
  leg: { icon: <Footprints size={18} />, promptName: 'leg placement, long wrapping curve' },
  ribs: { icon: <MoveHorizontal size={18} />, promptName: 'ribs placement, vertical elongated' },
};

export default function GeneratorPage() {
  const t = useTranslations('generator');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { apiKey, hasKey } = useApiKey();
  const { isSignedIn } = useUser();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showAds, setShowAds] = useState(false);

  // Buscar se deve exibir ads (free logado ou anônimo)
  useEffect(() => {
    if (!isSignedIn) {
      setShowAds(true);
      return;
    }
    fetch('/api/user/status')
      .then(r => r.json())
      .then(d => setShowAds(!!d.showAds))
      .catch(() => setShowAds(false));
  }, [isSignedIn]);
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
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);

  // Ad overlay para usuários free/anônimos
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('blacklinepro_prompt_history');
    if (savedHistory) {
      setPromptHistory(JSON.parse(savedHistory));
    }
    // Sempre iniciar com controles abertos (especialmente importante no mobile)
    setShowControls(true);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError(tCommon('error'));
      return;
    }

    // Validar tamanho (max 20MB para inline data)
    if (file.size > 20 * 1024 * 1024) {
      setError(t('errors.imageTooLarge'));
      return;
    }

    setReferenceImageFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setReferenceImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImageFile(null);
  };

  const handleGenerate = async () => {
    if (!prompt) return;

    // Se não está logado e não tem chave API, mostrar modal de setup
    if (!isSignedIn && !hasKey) {
      setShowApiKeyModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    // No mobile, manter painel aberto para feedback visual
    if (window.innerWidth >= 1024) {
      setShowControls(false);
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
      fullPrompt += `, designed for ${comp.promptName}`;
    }

    // Adicionar negative prompt
    if (negativePrompt.trim()) {
      fullPrompt += `. Avoid: ${negativePrompt.trim()}`;
    }

    try {
      const res = await fetch('/api/stencil/generate-idea', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-User-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          size,
          referenceImage: referenceImage || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Free/anônimos: mostrar overlay de anúncio (15s)
        if (showAds) {
          setPendingImage(data.image);
          setShowAdOverlay(true);
        } else {
          setGeneratedImage(data.image);
        }

        // Salvar prompt no histórico (máximo 10)
        const trimmedPrompt = prompt.trim();
        if (trimmedPrompt) {
          const newHistory = [trimmedPrompt, ...promptHistory.filter(p => p !== trimmedPrompt)].slice(0, 10);
          setPromptHistory(newHistory);
          localStorage.setItem('blacklinepro_prompt_history', JSON.stringify(newHistory));
        }
      } else if (data.requiresSubscription) {
        setError(data.message || t('errors.requiresSubscription'));
        setTimeout(() => {
          window.location.href = '/pricing';
        }, 2000);
      } else {
        setError(data.error || t('errors.generateFailed'));
        setShowControls(true);
      }
    } catch (err: any) {
      setError(err.message || t('errors.generateFailed'));
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
      {/* Banner para usuários anônimos */}
      {!isSignedIn && <AnonymousBanner apiKeySet={hasKey} />}

      {/* Modal de setup da chave API */}
      <ApiKeySetupModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={() => setShowApiKeyModal(false)}
      />

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">

        {/* Canvas Area */}
        <main className="flex-1 bg-zinc-950 flex items-center justify-center p-3 lg:p-6 min-h-[50vh] lg:min-h-0">

          {/* Empty State */}
          {!generatedImage && !loading && (
            <div className="text-center animate-fade-in bg-gradient-to-b from-indigo-500/5 to-transparent rounded-3xl p-8">
              <div className="w-24 h-24 lg:w-28 lg:h-28 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-zinc-800 animate-float">
                <Sparkles className="text-zinc-700" size={36} />
              </div>
              <p className="text-zinc-400 font-medium text-base lg:text-lg">{t('emptyState')}</p>
              <p className="text-zinc-700 text-xs mt-1">{t('hint')}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center">
              <LoadingSpinner size="lg" showSteps mode="image" />
            </div>
          )}

          {/* Ad Overlay — free/anon users: 15s wait after generation */}
          {showAdOverlay && (
            <div className="relative w-full h-[45vh] lg:h-[70vh]">
              <GeneratingAdOverlay
                slot="generator-generating"
                isGenerating={loading}
                onReady={() => {
                  setGeneratedImage(pendingImage);
                  setPendingImage(null);
                  setShowAdOverlay(false);
                }}
              />
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
          <Button
            onClick={() => setShowControls(true)}
            size="icon"
            className="lg:hidden fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg z-50"
          >
            <ChevronUp size={20} />
          </Button>
        )}

        {/* MOBILE: Barra de ações fixa quando imagem está gerada */}
        {generatedImage && !loading && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 p-3">
            <div className="flex gap-2">
              <a
                href={generatedImage}
                download={`blacklinepro-${Date.now()}.png`}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={18} /> {t('success.download')}
              </a>
              <Button
                onClick={handleUseAsBase}
                className="flex-1 py-3 rounded-xl gap-2"
              >
                <FileOutput size={18} /> {t('success.createStencil')}
              </Button>
              <Button
                onClick={reset}
                variant="secondary"
                className="w-14 py-3 rounded-xl text-zinc-400 hover:text-white"
                title={t('success.newGeneration')}
                aria-label="Fechar"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
        )}


        {/* Controls Panel - Esconde no mobile quando imagem está gerada */}
        <aside className={`
          ${showControls && !generatedImage ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
          fixed lg:relative bottom-0 left-0 right-0
          lg:w-72 xl:w-80
          bg-zinc-900/80 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-zinc-700/50
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
                    {t('prompt.label')}
                  </h3>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('prompt.placeholder')}
                    className="w-full h-20 lg:h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs lg:text-sm text-white placeholder-zinc-600 focus:border-indigo-500 outline-none resize-none"
                  />

                  {/* Upload de Imagem de Referência */}
                  <div className="mt-2">
                    {!referenceImage ? (
                      <label className="block">
                        <div className="cursor-pointer bg-zinc-950 border border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg p-2 transition-colors">
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Upload size={14} />
                            <span>{t('reference.add')}</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </div>
                      </label>
                    ) : (
                      <div className="relative bg-zinc-950 border border-indigo-500/50 rounded-lg p-2">
                        <Button
                          onClick={removeReferenceImage}
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6 min-w-0 min-h-0 rounded-full p-1"
                          title={tCommon('delete')}
                          aria-label="Fechar"
                        >
                          <X size={12} />
                        </Button>
                        <img
                          src={referenceImage}
                          alt="Referência"
                          className="w-full h-24 object-cover rounded"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">
                          ✓ {t('reference.added')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Histórico de Prompts */}
                  {promptHistory.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] text-zinc-500 hover:text-indigo-400 flex items-center gap-1 mt-1 transition-colors"
                      >
                        <ChevronUp size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                        {t('prompt.history')} ({promptHistory.length})
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
                  <label className="text-xs text-zinc-500 font-medium block mb-1.5">{t('styles.label')}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(TATTOO_STYLES) as TattooStyle[]).map((styleKey) => {
                      const style = TATTOO_STYLES[styleKey];
                      const isSelected = selectedStyle === styleKey;
                      return (
                        <button
                          key={styleKey}
                          onClick={() => setSelectedStyle(isSelected ? null : styleKey)}
                          className={`p-3 rounded-xl text-[10px] font-medium border transition-all duration-200 flex flex-col items-center gap-1 hover:scale-[1.02] ${
                            isSelected
                              ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300 ring-1 ring-indigo-500/30'
                              : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50'
                          }`}
                        >
                          <span className="flex items-center justify-center">{style.icon}</span>
                          <span>{t(`styles.${styleKey}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedStyle && (
                    <p className="text-[9px] text-indigo-400 mt-1.5 flex items-center gap-1">
                      <Sparkles size={10} /> {t(`styles.${selectedStyle}`)} {t('styles.applied')}
                    </p>
                  )}
                </div>

                {/* Composição / Região do Corpo */}
                <div>
                  <label className="text-xs text-zinc-500 font-medium block mb-1.5">{t('bodyRegion.label')}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(COMPOSITIONS) as Composition[]).map((compKey) => {
                      const comp = COMPOSITIONS[compKey];
                      const isSelected = selectedComposition === compKey;
                      const translatedName = t(`bodyRegion.${compKey}.name`);
                      const translatedHint = t(`bodyRegion.${compKey}.hint`);
                      return (
                        <button
                          key={compKey}
                          onClick={() => setSelectedComposition(compKey)}
                          className={`p-3 rounded-xl text-[10px] font-medium border transition-all duration-200 flex items-center justify-center gap-1.5 hover:scale-[1.02] ${
                            isSelected
                              ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300 ring-1 ring-indigo-500/30'
                              : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50'
                          }`}
                          title={translatedHint}
                        >
                          <span className="flex items-center justify-center">{comp.icon}</span>
                          <span>{translatedName}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedComposition !== 'free' && (
                    <p className="text-[9px] text-indigo-400 mt-1">
                      <MoveRight size={10} className="inline mr-1" />
                      {t(`bodyRegion.${selectedComposition}.hint`)}
                    </p>
                  )}
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="text-xs text-zinc-500 font-medium block mb-1">{t('negative.label')}</label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder={t('negative.placeholder')}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-[11px] text-white placeholder-zinc-600 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 font-medium block mb-1">{t('size.label')}</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['A4', 'A3', '1K', '2K', '4K'] as ImageSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                          size === s
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-zinc-400 mt-1">
                    {t(`size.${size}`)}
                  </p>
                </div>

                {error && (
                  <p className="text-red-400 text-[10px] text-center bg-red-900/20 p-2 rounded-lg">{error}</p>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  variant="gradient"
                  size="xl"
                  className={`w-full py-2.5 lg:py-3 rounded-xl gap-2 shadow-lg shadow-indigo-900/30 ${
                    prompt.trim() && !loading ? 'animate-glow-pulse' : ''
                  }`}
                >
                  <Sparkles size={14} />
                  {t('cta')}
                </Button>
              </>
            )}

            {/* After Generation */}
            {generatedImage && (
              <div className="animate-fade-in">
                <div className="p-3 rounded-xl border bg-indigo-900/20 border-indigo-500/30 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-indigo-400" />
                  </div>
                  <p className="text-xs text-indigo-300">
                    {t('success.description')}
                  </p>
                </div>

                <div className="space-y-2 mt-3">
                  <Button
                    onClick={handleUseAsBase}
                    className="w-full py-3 rounded-xl gap-2 shadow-lg shadow-indigo-900/30 font-semibold"
                  >
                    <FileOutput size={16} /> {t('success.createStencil')}
                    <MoveRight size={16} />
                  </Button>

                  <a
                    href={generatedImage}
                    download={`blacklinepro-${Date.now()}.png`}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <Download size={14} /> {t('success.download')}
                  </a>
                </div>

                <Button
                  onClick={reset}
                  variant="ghost"
                  className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 mt-2"
                >
                  ← {t('success.another')}
                </Button>
              </div>
            )}

          {/* AdSense — exibido apenas para usuários anônimos */}
          {!isSignedIn && (
            <div className="mt-4 px-1">
              <AdSlot slot="generator-sidebar" format="rectangle" />
            </div>
          )}
          </div>
        </aside>
      </div>
    </div>
  );
}
