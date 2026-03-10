'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import StencilAdjustControls from '@/components/editor/StencilAdjustControls';
import { useApiKey } from '@/hooks/useApiKey';
import ApiKeySetupModal from '@/components/ApiKeySetupModal';
import AnonymousBanner from '@/components/AnonymousBanner';
import AdSlot from '@/components/AdSlot';
import GeneratingAdOverlay from '@/components/GeneratingAdOverlay';
import { useUser } from '@clerk/nextjs';

import QualityIndicator from '@/components/editor/QualityIndicator';
import ResizeModal from '@/components/editor/ResizeModal';
import MobileActionBar from '@/components/editor/MobileActionBar';
import EditorToast from '@/components/editor/EditorToast';
import type { ToastData } from '@/components/editor/EditorToast';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save, Download, Image as ImageIcon, X, Zap, PenTool, Layers, ScanLine, Settings, ChevronUp, Ruler, Undo, Redo, Brush, Edit3 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEditorHistory } from '@/hooks/useEditorHistory';
import { DEFAULT_ADJUST_CONTROLS, type AdjustControls } from '@/lib/stencil-types';
import { applyAdjustments, resetControls } from '@/lib/stencil-adjustments';
import { processImageOnClient } from '@/lib/canvas-processor';
import { storage } from '@/lib/client-storage';
import { compressIfNeeded } from '@/lib/image-compress';
import BlurPreviewModal from '@/components/upsell/BlurPreviewModal';
import AsaasCheckoutModal from '@/components/AsaasCheckoutModal';
import { DrawingEditor } from '@/components/drawing';
import type { Stroke } from '@/lib/drawing/types';
import type { PlanType } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/billing/types';

type Style = 'standard' | 'perfect_lines' | 'anime';
type ComparisonMode = 'wipe' | 'overlay' | 'split';

export default function EditorPage() {
  const t = useTranslations('editor');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiKey, hasKey, isLoaded: apiKeyLoaded } = useApiKey();
  const { isSignedIn } = useUser();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showAds, setShowAds] = useState(false); // false até verificar status do usuário

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
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedStencil, setGeneratedStencil] = useState<string | null>(null);
  const [adjustedStencil, setAdjustedStencil] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<Style>('standard');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('overlay');
  const [showControls, setShowControls] = useState(true);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false); // Toggle rápido (Espaço)
  const [showResizeModal, setShowResizeModal] = useState(false); // Modal de resize

  // Tamanho - ANTES de gerar
  const [widthCm, setWidthCm] = useState(15);
  const [heightCm, setHeightCm] = useState(15);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Controles de ajuste
  const [adjustControls, setAdjustControls] = useState<AdjustControls>(DEFAULT_ADJUST_CONTROLS);

  // Histórico (Undo/Redo)
  const history = useEditorHistory();

  // Controle de seções expansíveis (mobile)
  const [showSizeSection, setShowSizeSection] = useState(false);
  const [showModeSection, setShowModeSection] = useState(false);
  const [showAdjustSection, setShowAdjustSection] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringHistoryRef = useRef(false); // Flag para ignorar mudanças do histórico
  const rafIdRef = useRef<number | null>(null); // RequestAnimationFrame para slider suave

  // Blur Preview Modal (upsell para free users)
  const [showBlurPreview, setShowBlurPreview] = useState(false);
  const [blurredPreviewImage, setBlurredPreviewImage] = useState<string | null>(null);

  // Ad overlay para usuários free/anônimos durante geração
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [pendingStencil, setPendingStencil] = useState<string | null>(null);

  // Checkout Modal (pagamento Stripe estilizado)
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'ink' | 'pro'>('ink');
  const [checkoutCycle, setCheckoutCycle] = useState<BillingCycle>('monthly');

  // Drawing Mode (modo de desenho)
  const [showDrawingEditor, setShowDrawingEditor] = useState(false);
  const [drawingDimensions, setDrawingDimensions] = useState({ width: 800, height: 600 });

  // Toast notifications
  const [toast, setToast] = useState<ToastData | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Imagem atual para exibir (ajustada ou gerada)
  const currentStencil = adjustedStencil || generatedStencil;

  // Helper: verificar se controles estão nos valores padrão
  const isDefaultControls = (controls: AdjustControls): boolean => {
    return (
      controls.brightness === 0 &&
      controls.contrast === 0 &&
      controls.threshold === 128 &&
      controls.gamma === 1.0 &&
      controls.rotation === 0 &&
      !controls.flipHorizontal &&
      !controls.flipVertical &&
      !controls.invert &&
      !controls.removeNoise &&
      !controls.sharpen &&
      (controls.lineColor === '#000000' || !controls.lineColor) &&
      (controls.colorThreshold === 250 || !controls.colorThreshold)
    );
  };

  // Load image from storage (from Generator or Edit from Dashboard)
  useEffect(() => {
    const loadImages = async () => {
      // Check if editing existing project
      try {
        const editProject = await storage.get<any>('edit_project');
        if (editProject) {
          setOriginalImage(editProject.original_image);
          setGeneratedStencil(editProject.stencil_image);
          setSelectedStyle(editProject.style || 'standard');
          if (editProject.width_cm) setWidthCm(editProject.width_cm);
          if (editProject.height_cm) setHeightCm(editProject.height_cm);
          if (editProject.prompt_details) setPromptText(editProject.prompt_details);
          
          // Limpar cache após carregar para evitar conflitos
          await storage.remove('edit_project');
          setShowControls(true);
          return;
        }
      } catch (e) {
        console.error('Erro ao carregar projeto:', e);
      }

      // Check if coming from Generator
      try {
        const savedImage = await storage.get<string>('generated_image');
        if (savedImage) {
          setOriginalImage(savedImage);
          // Limpar cache após carregar para evitar imagens antigas
          await storage.remove('generated_image');
          setShowControls(true);
        }
      } catch (e) {
        console.error('Erro ao carregar imagem gerada:', e);
      }
    };

    loadImages();

    // Desktop sempre mostra controles
    if (window.innerWidth >= 1024) {
      setShowControls(true);
    }
  }, []);

  // Calculate height based on aspect ratio
  useEffect(() => {
    if (originalImage) {
      const img = new window.Image();
      img.src = originalImage;
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        setAspectRatio(ratio);
        setHeightCm(Number((widthCm / ratio).toFixed(1)));
      };
    }
  }, [widthCm, originalImage]);

  // Aplicar ajustes com debounce
  const applyAdjustmentsDebounced = useCallback((controls: AdjustControls) => {
    // Proteção: não processar se não houver stencil gerado
    if (!generatedStencil) {
      return;
    }

    // Proteção: não processar se já estiver ajustando
    if (isAdjusting) {
      return;
    }

    // Cancelar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Criar novo timer (50ms de debounce para Canvas - quase instantâneo)
    debounceTimerRef.current = setTimeout(async () => {
      // ✨ CORREÇÃO CRÍTICA: Se os controles estão no padrão, NÃO processar.
      // Isso preserva os tons de cinza e a arte original da IA (Topográfico/Ultra Pro).
      if (isDefaultControls(controls)) {
        setAdjustedStencil(null);
        return;
      }

      // Pour ajustes de cor, usamos o processamento local (Instantâneo)
      try {
        const adjusted = await processImageOnClient(generatedStencil, {
          threshold: controls.threshold,
          gamma: controls.gamma,
          brightness: controls.brightness,
          contrast: controls.contrast,
          invert: controls.invert,
          lineColor: controls.lineColor,
          colorThreshold: controls.colorThreshold
        });
        
        setAdjustedStencil(adjusted);
        history.pushState(adjusted, controls);
      } catch (error: any) {
        console.error('[Editor] Erro no processamento instantâneo:', error);
        // Fallback para API se o cliente falhar
        const adjusted = await applyAdjustments(generatedStencil, controls);
        setAdjustedStencil(adjusted);
        history.pushState(adjusted, controls);
      }
    }, 50);
  }, [generatedStencil, history, isAdjusting]);

  // Handler de mudança de controles
  const handleAdjustChange = (newControls: AdjustControls) => {
    setAdjustControls(newControls);

    // NÃO aplicar ajustes se estamos restaurando do histórico
    if (isRestoringHistoryRef.current) {
      return;
    }

    applyAdjustmentsDebounced(newControls);
  };

  // Reset de ajustes
  const handleResetAdjustments = useCallback(() => {
    const controls = resetControls();
    setAdjustControls(controls);
    setAdjustedStencil(null);
  }, []);

  // Handler de resize concluído
  const handleResizeComplete = (newImage: string, newWidthCm: number, newHeightCm: number) => {

    // Atualizar imagem gerada com a versão redimensionada
    setGeneratedStencil(newImage);
    setAdjustedStencil(null); // Limpar ajustes
    setWidthCm(newWidthCm);
    setHeightCm(newHeightCm);

    // Limpar histórico e adicionar novo estado
    history.clear();
    history.pushState(newImage, DEFAULT_ADJUST_CONTROLS);

    // Resetar controles de ajuste
    setAdjustControls(DEFAULT_ADJUST_CONTROLS);
  };

  // Presets removidos temporariamente (causavam travamento)

  // Undo
  const handleUndo = useCallback(() => {
    if (!history.canUndo) {
      return;
    }

    const previousState = history.undo();

    if (previousState) {
      // Marcar que estamos restaurando do histórico
      isRestoringHistoryRef.current = true;

      // Se controles são padrão, voltar ao original sem reprocessamento
      if (isDefaultControls(previousState.controls)) {
        setAdjustedStencil(null);
      } else {
        setAdjustedStencil(previousState.image);
      }

      setAdjustControls(previousState.controls);

      // Resetar flag após render
      setTimeout(() => {
        isRestoringHistoryRef.current = false;
      }, 100);

    }
  }, [history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (!history.canRedo) {
      return;
    }

    const nextState = history.redo();

    if (nextState) {
      // Marcar que estamos restaurando do histórico
      isRestoringHistoryRef.current = true;

      // Se controles são padrão, voltar ao original sem reprocessamento
      if (isDefaultControls(nextState.controls)) {
        setAdjustedStencil(null);
      } else {
        setAdjustedStencil(nextState.image);
      }

      setAdjustControls(nextState.controls);

      // Resetar flag após render
      setTimeout(() => {
        isRestoringHistoryRef.current = false;
      }, 100);

    }
  }, [history]);

  // Keyboard shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentStencil) return;

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

      // ESPAÇO = Toggle preview rápido (mostrar original)
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowOriginalPreview(true);
      }

      // R = Reset ajustes
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'TEXTAREA') {
        handleResetAdjustments();
      }

      // I = Inverter
      if (e.key === 'i' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'TEXTAREA') {
        setAdjustControls(prev => ({ ...prev, invert: !prev.invert }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Soltar ESPAÇO = Voltar ao stencil
      if (e.key === ' ') {
        setShowOriginalPreview(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentStencil, handleUndo, handleRedo, handleResetAdjustments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limpar cache anterior para evitar conflitos
      await storage.remove('edit_project');
      await storage.remove('generated_image');
      
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

    // Se não está logado e não tem chave API, mostrar modal de setup
    if (!isSignedIn && !hasKey) {
      setShowApiKeyModal(true);
      return;
    }

    // LIMPAR estêncil anterior antes de gerar novo
    setGeneratedStencil(null);
    setAdjustedStencil(null);
    setIsProcessing(true);
    // No mobile, manter painel aberto para ver o loading
    if (window.innerWidth >= 1024) {
      setShowControls(false);
    }

    try {
      // 🔥 COMPRESSÃO: Evitar erro 413 (Payload Too Large)
      const compressedImage = await compressIfNeeded(originalImage);

      const res = await fetch('/api/stencil/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-User-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          image: compressedImage,
          style: selectedStyle,
          promptDetails: promptText,
          widthCm,
          heightCm,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // 🎣 FREE USERS: Se é preview (blur + watermark), mostrar modal de upsell
        if (data.isPreview) {
          setBlurredPreviewImage(data.image);
          setShowBlurPreview(true);
          setShowControls(true);
          return;
        }

        let finalStencil = data.image;

        // 📐 RESIZE: Redimensionar stencil para o tamanho físico escolhido
        try {
          const resizeRes = await fetch('/api/image-resize', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: data.image,
              targetWidthCm: widthCm,
              dpi: 300,
              maintainAspect: true,
            }),
          });

          if (resizeRes.ok) {
            const resizeData = await resizeRes.json();
            finalStencil = resizeData.image;
            console.log('[Editor] Stencil redimensionado:', resizeData.metadata);
          }
        } catch (resizeError) {
          console.warn('[Editor] Resize falhou, usando stencil original:', resizeError);
        }

        // Free/anônimos: mostrar overlay de anúncio (15s)
        if (showAds) {
          setPendingStencil(finalStencil);
          setShowAdOverlay(true);
        } else {
          setGeneratedStencil(finalStencil);
          setSliderPosition(100);
          setComparisonMode('overlay');
          history.clear();
          history.pushState(finalStencil, DEFAULT_ADJUST_CONTROLS);
          setAdjustControls(DEFAULT_ADJUST_CONTROLS);
          autoSaveProject(finalStencil);
        }
      } else if (data.requiresSubscription) {
        setShowControls(true);
        showToast(data.message || t('messages.limitReached'), 'error');
      } else {
        alert(data.error || t('messages.generateError'));
        setShowControls(true);
      }
    } catch (error) {
      console.error(error);
      alert(t('messages.generateError'));
      setShowControls(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-save após gerar
  const autoSaveProject = async (stencilImage: string) => {
    try {
      // 🔥 COMPRESSÃO: Evitar erro 413
      const compressedOriginal = await compressIfNeeded(originalImage!);
      const compressedStencil = await compressIfNeeded(stencilImage);
      
      const res = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Estêncil ${new Date().toLocaleTimeString()}`,
          originalImage: compressedOriginal,
          stencilImage: compressedStencil,
          style: selectedStyle,
          widthCm,
          heightCm,
          promptDetails: promptText,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('Erro ao salvar projeto:', data);
        // Não mostrar alert para não incomodar, mas logar
      } else {
      }
    } catch (error) {
      console.error('Erro ao auto-salvar:', error);
    }
  };

  // Handler para quando o usuário clica em assinar no BlurPreviewModal
  const handleUpsellSubscribe = (plan: PlanType, cycle: BillingCycle) => {
    setShowBlurPreview(false);
    // Abrir o CheckoutModal estilizado com Stripe Elements
    setCheckoutPlan(plan as 'ink' | 'pro');
    setCheckoutCycle(cycle);
    setShowCheckout(true);
  };

  const handleSave = async () => {
    if (!currentStencil || !originalImage) return;

    const name = prompt(`${t('actions.saveName')}:`) || `${t('actions.stencil')} ${new Date().toLocaleTimeString()}`;

    setIsSaving(true);
    try {
      // 🔥 COMPRESSÃO: Evitar erro 413
      const compressedOriginal = await compressIfNeeded(originalImage);
      const compressedStencil = await compressIfNeeded(currentStencil);
      
      const res = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          originalImage: compressedOriginal,
          stencilImage: compressedStencil,
          style: selectedStyle,
          widthCm,
          heightCm,
          promptDetails: promptText,
        }),
      });

      if (res.ok) {
        showToast(t('messages.saveSuccess'), 'success');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        showToast(t('messages.saveError'), 'error');
      }
    } catch (error) {
      showToast(t('messages.saveError'), 'error');
    } finally {
    setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!currentStencil) {
      showToast(tCommon('error'), 'error');
      return;
    }

    const fileName = `stencil-${widthCm}x${heightCm}cm-${Date.now()}.png`;

    try {
      // 🔧 CORREÇÃO: Se há ajustes aplicados mas não há adjustedStencil, aplicar antes de baixar
      let imageToDownload = currentStencil;

      // Verificar se há ajustes não-padrão que precisam ser aplicados
      if (!isDefaultControls(adjustControls) && !adjustedStencil && generatedStencil) {
        showToast(t('messages.applyingAdjustments'), 'info');
        
        try {
          const result = await applyAdjustments(generatedStencil, adjustControls);
          if (result) {
            imageToDownload = result;
            setAdjustedStencil(result); // Salvar para próximas ações
          }
        } catch (error) {
          console.error('Erro ao aplicar ajustes:', error);
          showToast(t('messages.downloadWithoutAdjustments'), 'error');
        }
      }

      // ⚠️ CORREÇÃO CSP: fetch não funciona com data: URI
      // Converter base64 diretamente para blob (sem fetch)
      const base64Data = imageToDownload.replace(/^data:image\/\w+;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(t('messages.downloadStarted'), 'success');
    } catch (error) {
      console.error('Erro no download:', error);
      // Fallback direto com base64 (funciona na maioria dos navegadores)
      const link = document.createElement('a');
      link.href = currentStencil;
      link.download = fileName;
      link.click();
      showToast(t('messages.downloadStarted'), 'success');
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

  // Regenerar: mantém configurações, gera novo stencil
  const handleRegenerate = () => {
    setGeneratedStencil(null);
    setAdjustedStencil(null);
    setSliderPosition(50);
    setAdjustControls(DEFAULT_ADJUST_CONTROLS);
    history.clear();
    // Chama handleGenerate após limpar
    setTimeout(() => handleGenerate(), 100);
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

  // Copiar stencil para clipboard
  const handleCopyToClipboard = async () => {
    if (!currentStencil) return;

    try {
      const response = await fetch(currentStencil);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);

      showToast(t('messages.copied'), 'success');
    } catch (error) {
      showToast(tCommon('error'), 'error');
    }
  };

  // Abrir modo de desenho
  const handleOpenDrawingMode = useCallback(() => {
    if (!currentStencil) return;

    // Calcular dimensões baseadas no tamanho real da imagem
    const img = new window.Image();
    img.src = currentStencil;
    img.onload = () => {
      setDrawingDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      setShowDrawingEditor(true);
    };
  }, [currentStencil]);

  // Salvar desenho do modo de desenho
  const handleDrawingSave = useCallback((imageDataUrl: string, strokes: Stroke[]) => {
    // Atualizar o stencil ajustado com a imagem editada
    setAdjustedStencil(imageDataUrl);
    setShowDrawingEditor(false);
    showToast(t('messages.drawingSaved', { count: strokes.length }), 'success');
  }, [t]);

  const applyPreset = (preset: string) => {
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
        <main className="flex-1 bg-zinc-950 flex items-center justify-center p-2 lg:p-4 min-h-[40vh] lg:min-h-0 pb-20 lg:pb-6">

          {/* Upload State */}
          {!originalImage && (
            <div className="text-center">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group w-56 h-56 lg:w-80 lg:h-80 relative rounded-2xl flex flex-col items-center justify-center text-zinc-500 transition-all duration-300 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/50 animate-fade-in"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-zinc-800/80 group-hover:bg-indigo-600/20 flex items-center justify-center transition-all duration-300">
                    <ImageIcon size={28} className="text-zinc-400 group-hover:text-indigo-400 transition-colors duration-300" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-zinc-300 group-hover:text-white transition-colors">{t('upload.button')}</span>
                    <p className="text-xs text-zinc-600 mt-1">PNG, JPG, WEBP</p>
                  </div>
                </div>
              </button>
            </div>
          )}
          
          {/* Processing State */}
          {originalImage && isProcessing && (
            <LoadingSpinner size="lg" showSteps />
          )}

          {/* Ad Overlay — free/anon users: 15s wait after generation */}
          {showAdOverlay && (
            <GeneratingAdOverlay
              slot="editor-generating"
              isGenerating={isProcessing}
              onReady={() => {
                const stencil = pendingStencil;
                if (stencil) {
                  setGeneratedStencil(stencil);
                  setSliderPosition(100);
                  setComparisonMode('overlay');
                  history.clear();
                  history.pushState(stencil, DEFAULT_ADJUST_CONTROLS);
                  setAdjustControls(DEFAULT_ADJUST_CONTROLS);
                  autoSaveProject(stencil);
                }
                setPendingStencil(null);
                setShowAdOverlay(false);
              }}
            />
          )}
          
          {/* Original Image (before generation) */}
          {originalImage && !isProcessing && !currentStencil && (
            <div 
              className="relative shadow-2xl rounded-lg overflow-hidden bg-white h-[60vh] lg:h-[85vh] max-w-full"
              style={{ aspectRatio: aspectRatio || 'auto' }}
            >
              <Image
                src={originalImage}
                alt="Original"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 75vw"
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          )}

          {/* Comparison View (after generation) - Height increased to 85vh */}
          {originalImage && !isProcessing && currentStencil && (
            <div 
              className="relative select-none shadow-2xl rounded-lg overflow-hidden bg-white h-[60vh] lg:h-[85vh] max-w-full"
              style={{ aspectRatio: aspectRatio || 'auto' }}
            >
              {/* Mode Toggle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-full p-0.5 flex gap-0.5 shadow-xl">
                <button
                  onClick={() => setComparisonMode('wipe')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    comparisonMode === 'wipe' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={t('comparison.horizontalTooltip')}
                >
                  <ScanLine size={12} /> {t('comparison.horizontal')}
                </button>
                <button
                  onClick={() => setComparisonMode('overlay')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    comparisonMode === 'overlay' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={t('comparison.blendTooltip')}
                >
                  <Layers size={12} /> {t('comparison.blend')}
                </button>
              </div>

              {/* Indicador de preview rápido (Espaço) */}
              {showOriginalPreview && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-blue-600 border border-blue-400 rounded-lg px-3 py-1.5 shadow-xl animate-pulse">
                  <p className="text-white text-xs font-medium">{t('comparison.holdSpace')}</p>
                </div>
              )}

              {/* Undo/Redo Buttons */}
              {generatedStencil && (
                <div className="absolute top-2 right-2 z-50 flex gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={!history.canUndo || isAdjusting}
                      className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-lg p-1.5 text-zinc-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={`Desfazer (Ctrl+Z) - ${history.currentIndex}/${history.historySize - 1}`}
                    >
                      <Undo size={14} />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={!history.canRedo || isAdjusting}
                      className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-lg p-1.5 text-zinc-400 hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={`Refazer (Ctrl+Y) - ${history.currentIndex}/${history.historySize - 1}`}
                    >
                      <Redo size={14} />
                    </button>
                </div>
              )}

              {/* Background (Original) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalImage}
                alt="Original"
                className="block w-full h-full object-contain"
                draggable={false}
                style={{
                  opacity: showOriginalPreview ? 1 : (comparisonMode === 'overlay' ? 0.5 : 1),
                  display: showOriginalPreview ? 'block' : 'block'
                }}
              />

              {/* Foreground (Stencil) */}
              <div
                className="absolute inset-0 bg-white"
                style={{
                  clipPath:
                    comparisonMode === 'wipe' ? `inset(0 ${100 - sliderPosition}% 0 0)` :
                    comparisonMode === 'split' ? `inset(${sliderPosition}% 0 0 0)` :
                    'none',
                  mixBlendMode: comparisonMode === 'overlay' ? 'multiply' : 'normal',
                  opacity: showOriginalPreview ? 0 : (comparisonMode === 'overlay' ? sliderPosition / 100 : 1)
                }}
              >
                <Image 
                  src={currentStencil} 
                  alt="Stencil" 
                  fill
                  className="object-contain" 
                  draggable={false}
                  unoptimized
                  style={{
                    transform: `
                      rotate(${adjustControls.rotation}deg)
                      scaleX(${adjustControls.flipHorizontal ? -1 : 1})
                      scaleY(${adjustControls.flipVertical ? -1 : 1})
                    `.trim()
                  }}
                />
              </div>

              {/* Wipe handle - Horizontal */}
              {comparisonMode === 'wipe' && !showOriginalPreview && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-20" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="flex gap-px"><div className="w-px h-2 bg-white/80"></div><div className="w-px h-2 bg-white/80"></div></div>
                  </div>
                </div>
              )}

              {/* Split handle - Vertical */}
              {comparisonMode === 'split' && !showOriginalPreview && (
                <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 z-20" style={{ top: `${sliderPosition}%` }}>
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="flex flex-col gap-px"><div className="h-px w-2 bg-white/80"></div><div className="h-px w-2 bg-white/80"></div></div>
                  </div>
                </div>
              )}

              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (rafIdRef.current) {
                    cancelAnimationFrame(rafIdRef.current);
                  }
                  rafIdRef.current = requestAnimationFrame(() => {
                    setSliderPosition(value);
                  });
                }}
                className={`absolute inset-0 w-full h-full opacity-0 z-30 ${
                  comparisonMode === 'wipe' ? 'cursor-ew-resize' :
                  comparisonMode === 'split' ? 'cursor-ns-resize' :
                  'cursor-pointer'
                }`}
                disabled={showOriginalPreview}
              />

              {/* Processing overlay */}
              {isAdjusting && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
                  <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-white text-sm">Aplicando ajustes...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* MOBILE: Botão flutuante para abrir painel quando fechado */}
        {!showControls && !currentStencil && (
          <Button
            onClick={() => setShowControls(true)}
            size="icon"
            className="lg:hidden fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-lg z-50 bg-indigo-600 hover:bg-indigo-500"
          >
            <ChevronUp size={20} />
          </Button>
        )}

        {/* MOBILE: Barra de ações fixa quando stencil está gerado */}
        {currentStencil && (
          <MobileActionBar
            onToggleControls={() => setShowControls(!showControls)}
            onOpenDrawingMode={handleOpenDrawingMode}
            onDownload={handleDownload}
            onSave={handleSave}
            onNewUpload={handleNewUpload}
            t={t}
          />
        )}

        {/* Overlay - Mobile quando painel está aberto */}
        {showControls && generatedStencil && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
            onClick={() => setShowControls(false)}
          />
        )}

        {/* Controls Panel - Responsivo e acessível */}
        <aside 
          className={`
            ${showControls ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            fixed lg:relative bottom-0 left-0 right-0 lg:w-72 xl:w-80
            bg-zinc-900/80 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-zinc-700/50
            transition-transform duration-300 z-40 shadow-2xl lg:shadow-none
            rounded-t-2xl lg:rounded-none
            max-h-[60vh] lg:max-h-none
          `}
        >
          {/* Drag handle - Clicável para abrir/fechar */}
          <div
            onClick={() => setShowControls(!showControls)}
            className="lg:hidden flex justify-center pt-3 pb-2 cursor-pointer active:bg-zinc-800/50 transition-colors"
          >
            <div className="w-12 h-1 bg-zinc-600 rounded-full"></div>
          </div>

          {/* Container scrollável - MOBILE ONLY */}
          <div 
            className="max-h-[calc(60vh-40px)] lg:max-h-none overflow-y-auto lg:overflow-visible overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-2 lg:p-5 space-y-1.5 lg:space-y-3 pb-24 lg:pb-5">

            {/* Botão Nova Imagem - Aparece quando tem imagem carregada */}
            {originalImage && !generatedStencil && (
              <Button
                onClick={handleNewUpload}
                variant="secondary"
                className="w-full py-2 rounded-xl gap-2 text-sm"
              >
                <X size={14} /> {t('actions.new')}
              </Button>
            )}

            {/* TAMANHO - Accordion no mobile */}
            {!generatedStencil && originalImage && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setShowSizeSection(!showSizeSection)}
                  className="w-full p-2 flex items-center justify-between lg:cursor-default"
                >
                  <h3 className="text-white font-medium text-xs flex items-center gap-1.5">
                    <Ruler size={11} className="text-indigo-400" /> {t('controls.size')}
                  </h3>
                  <ChevronUp size={14} className={`lg:hidden text-zinc-500 transition-transform ${showSizeSection ? 'rotate-180' : ''}`} />
                </button>
                
                <div className={`${showSizeSection ? 'block' : 'hidden'} lg:block px-2 pb-2`}>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {['A4', 'A3', 'Portrait', 'Square'].map((preset) => (
                      <button key={preset} onClick={() => applyPreset(preset)} className="py-1 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 border border-zinc-800 hover:border-indigo-700">
                        {t(`controls.presets.${preset}`)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">{t('controls.size')} (cm)</label>
                      <input type="number" value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-white text-xs focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-0.5">{tCommon('height')} (cm)</label>
                      <input type="number" value={heightCm} readOnly className="w-full bg-zinc-900/50 border border-zinc-700 rounded p-1.5 text-zinc-500 text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODO - Accordion no mobile */}
            {!generatedStencil && (
              <>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <button onClick={() => setShowModeSection(!showModeSection)} className="w-full p-2 flex items-center justify-between lg:cursor-default">
                    <h3 className="text-white font-medium text-xs flex items-center gap-1.5">
                      <Zap size={11} className="text-indigo-500" /> {t('controls.modes')}
                    </h3>
                    <ChevronUp size={14} className={`lg:hidden text-zinc-500 transition-transform ${showModeSection ? 'rotate-180' : ''}`} />
                  </button>
                  
                <div className={`${showModeSection ? 'block' : 'hidden'} lg:block px-2 pb-2`}>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button onClick={() => setSelectedStyle('perfect_lines')} className={`flex flex-col items-center p-3 rounded-xl border text-xs font-medium transition-all duration-200 hover:scale-[1.02] ${selectedStyle === 'perfect_lines' ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                        <Zap size={16} className="mb-1" /> {t('styles.perfect_lines')}
                      </button>
                      <button onClick={() => setSelectedStyle('standard')} className={`flex flex-col items-center p-3 rounded-xl border text-xs font-medium transition-all duration-200 hover:scale-[1.02] ${selectedStyle === 'standard' ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                        <PenTool size={16} className="mb-1" /> {t('styles.standard')}
                      </button>
                      <button onClick={() => setSelectedStyle('anime')} className={`flex flex-col items-center p-3 rounded-xl border text-xs font-medium transition-all duration-200 hover:scale-[1.02] ${selectedStyle === 'anime' ? 'bg-indigo-500/15 border-indigo-500/60 text-indigo-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`} title="Para animes, desenhos, Maori, Tribal">
                        <Brush size={16} className="mb-1" /> {t('styles.anime')}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 text-center">
                      {selectedStyle === 'anime' ? t('styles.animeDesc') : selectedStyle === 'standard' ? t('styles.standardDesc') : t('styles.perfectLinesDesc')}
                    </p>
                  </div>
                </div>

                <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder={t('controls.extraInstructions')} className="w-full h-10 lg:h-14 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs lg:text-sm text-white placeholder-zinc-600 focus:border-indigo-600 outline-none resize-none" />

                <button
                  onClick={handleGenerate}
                  disabled={isProcessing || !originalImage}
                  className="w-full py-2.5 lg:py-3 rounded-xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                >
                  {selectedStyle === 'anime' ? <Brush size={14} /> : selectedStyle === 'perfect_lines' ? <Zap size={14} /> : <PenTool size={14} />}
                  {selectedStyle === 'anime' ? t('controls.generateAnime') : t('controls.generateStandard')}
                </button>
              </>
            )}

            {/* AJUSTES (após gerar) */}
            {generatedStencil && (
              <>
                {/* Botões de Ação - Desktop */}
                <div className="hidden lg:grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleDownload}
                    className="py-2.5 rounded-xl gap-2 text-sm font-semibold"
                  >
                    <Download size={16} /> {t('actions.download')}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="py-2.5 rounded-xl gap-2 text-sm font-semibold"
                  >
                    <Save size={16} /> {isSaving ? t('actions.saving') : t('actions.saveShort')}
                  </Button>
                </div>

                {/* Botão Modo Desenho - Destaque */}
                <Button
                  onClick={handleOpenDrawingMode}
                  variant="gradient"
                  className="hidden lg:flex w-full py-3 rounded-xl gap-2 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-900/30"
                  title="Adicionar traços manualmente"
                >
                  <Edit3 size={18} />
                  <span>{t('actions.drawing')}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">PRO</span>
                </Button>

                {/* Indicador de Qualidade/DPI */}
                <QualityIndicator
                  imageBase64={currentStencil}
                  widthCm={widthCm}
                  heightCm={heightCm}
                  onOptimizeClick={() => setShowResizeModal(true)}
                />

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <button onClick={() => setShowAdjustSection(!showAdjustSection)} className="w-full p-2 flex items-center justify-between">
                    <h3 className="text-white font-medium text-xs flex items-center gap-1.5">
                      <Settings size={11} className="text-indigo-400" /> {t('controls.adjustments')}
                    </h3>
                    <ChevronUp size={14} className={`text-zinc-500 transition-transform ${showAdjustSection ? 'rotate-180' : ''}`} />
                  </button>

                  {showAdjustSection && (
                    <div className="px-2 pb-2">
                      <StencilAdjustControls
                        controls={adjustControls}
                        onChange={handleAdjustChange}
                        onReset={handleResetAdjustments}
                        isProcessing={isAdjusting}
                      />
                    </div>
                  )}
                </div>



                {/* Botões de ação */}
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleRegenerate}
                    disabled={isProcessing}
                    className="flex-1 py-2 rounded-xl gap-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800"
                    title="Regenerar com mesmas configurações"
                  >
                    <Zap size={14} /> {t('controls.regenerate')}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="secondary"
                    className="px-4 py-2 rounded-xl gap-2 text-sm"
                    title="Limpar e começar novo"
                  >
                    <RotateCcw size={14} />
                  </Button>
                </div>
              </>
            )}

            {/* AdSense — exibido apenas para usuários anônimos */}
            {!isSignedIn && (
              <div className="mt-4 px-1">
                <AdSlot slot="editor-sidebar" format="rectangle" />
              </div>
            )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal de Resize/Otimização de Qualidade */}
      <ResizeModal
        isOpen={showResizeModal}
        onClose={() => setShowResizeModal(false)}
        currentImage={currentStencil || generatedStencil || ''}
        currentWidthCm={widthCm}
        currentHeightCm={heightCm}
        onResizeComplete={handleResizeComplete}
      />

      {/* Blur Preview Modal (Upsell para free users) */}
      <BlurPreviewModal
        isOpen={showBlurPreview}
        onClose={() => setShowBlurPreview(false)}
        blurredImageSrc={blurredPreviewImage || ''}
        onSubscribe={handleUpsellSubscribe}
      />

      {/* Checkout Modal (Stripe Elements estilizado) */}
      <AsaasCheckoutModal
        plan={checkoutPlan}
        cycle={checkoutCycle}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
      />

      {/* Drawing Editor Modal */}
      {showDrawingEditor && currentStencil && originalImage && (
        <DrawingEditor
          originalImage={originalImage}
          stencilImage={currentStencil}
          width={drawingDimensions.width}
          height={drawingDimensions.height}
          onClose={() => setShowDrawingEditor(false)}
          onSave={handleDrawingSave}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <EditorToast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
