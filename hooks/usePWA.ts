'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePWAReturn {
  /** Se o app pode ser instalado */
  canInstall: boolean;
  /** Se o app já está instalado (standalone) */
  isInstalled: boolean;
  /** Se está em um device iOS */
  isIOS: boolean;
  /** Se está em modo standalone (PWA aberto) */
  isStandalone: boolean;
  /** Se o banner foi dismissado pelo usuário */
  isDismissed: boolean;
  /** Função para iniciar instalação */
  installApp: () => Promise<boolean>;
  /** Função para dismissar o banner */
  dismissBanner: () => void;
  /** Status do Service Worker */
  swStatus: 'idle' | 'installing' | 'installed' | 'error';
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function usePWA(): UsePWAReturn {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [swStatus, setSwStatus] = useState<'idle' | 'installing' | 'installed' | 'error'>('idle');

  // Detectar ambiente no mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detectar se está em modo standalone
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Verificar se foi dismissado recentemente
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissTime < DISMISS_DURATION) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);

  // Capturar evento beforeinstallprompt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstall = (e: Event) => {
      // Prevenir que o browser mostre o banner padrão
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA] Install prompt capturado');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('[PWA] App foi instalado!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Registrar Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Não registrar em desenvolvimento para evitar problemas
    if (process.env.NODE_ENV === 'development') {
      console.log('[PWA] Service Worker desabilitado em desenvolvimento');
      return;
    }

    async function registerSW() {
      try {
        setSwStatus('installing');

        // ⚡ OTIMIZAÇÃO: Delay adicional para não bloquear hidratação React
        await new Promise(resolve => setTimeout(resolve, 1000));

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        console.log('[PWA] ⚡ Service Worker registrado (lazy):', registration.scope);
        setSwStatus('installed');

        // Verificar atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] 🔄 Nova versão disponível');
              }
            });
          }
        });

      } catch (error) {
        console.error('[PWA] ❌ Erro ao registrar Service Worker:', error);
        setSwStatus('error');
      }
    }

    // ⚡ OTIMIZAÇÃO: Aguardar carregamento E dar tempo para hidratação
    if (document.readyState === 'complete') {
      // Delay de 1s para garantir que não atrapalha FCP/LCP
      setTimeout(registerSW, 1000);
    } else {
      const handleLoad = () => setTimeout(registerSW, 1000);
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  // Função para instalar o app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      console.log('[PWA] Nenhum prompt de instalação disponível');
      return false;
    }

    try {
      // Mostrar o prompt nativo
      await installPrompt.prompt();
      
      // Aguardar escolha do usuário
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] Usuário aceitou instalar');
        setIsInstalled(true);
        return true;
      } else {
        console.log('[PWA] Usuário recusou instalar');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Erro ao instalar:', error);
      return false;
    } finally {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  // Função para dismissar o banner
  const dismissBanner = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  }, []);

  return {
    canInstall: !!installPrompt && !isInstalled && !isDismissed,
    isInstalled,
    isIOS,
    isStandalone,
    isDismissed,
    installApp,
    dismissBanner,
    swStatus,
  };
}
