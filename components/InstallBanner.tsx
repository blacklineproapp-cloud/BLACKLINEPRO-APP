'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePWA } from '@/hooks/usePWA';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface InstallBannerProps {
  /** Delay em ms antes de mostrar o banner (default: 3000) */
  delay?: number;
}

export function InstallBanner({ delay = 3000 }: InstallBannerProps) {
  const t = useTranslations('installBanner');
  const { canInstall, isIOS, isStandalone, isDismissed, installApp, dismissBanner } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Delay para mostrar o banner (não ser intrusivo)
  useEffect(() => {
    if (isStandalone || isDismissed) return;
    
    const timer = setTimeout(() => {
      if (canInstall || isIOS) {
        setIsVisible(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [canInstall, isIOS, isStandalone, isDismissed, delay]);

  // Não mostrar se já está instalado ou foi dismissado
  if (isStandalone || isDismissed || (!canInstall && !isIOS)) {
    return null;
  }

  // Não mostrar até o delay passar
  if (!isVisible) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      const success = await installApp();
      if (success) {
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    dismissBanner();
    setIsVisible(false);
  };

  return (
    <>
      {/* Banner Principal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
        <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                {t('title')}
              </span>
            </div>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-transparent"
              aria-label={t('closeLabel')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Ícone do App */}
              <div className="flex-shrink-0 w-14 h-14 bg-black rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/web-app-manifest-192x192.png" 
                  alt="Black Line Pro" 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base">
                  {t('appName')}
                </h3>
                <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">
                  {t('description')}
                </p>
              </div>
            </div>

            {/* Botão de Instalar */}
            <Button
              onClick={handleInstall}
              className="w-full mt-4 bg-indigo-500 hover:bg-indigo-400 text-black py-3 px-4 rounded-xl active:scale-[0.98] gap-2"
            >
              {isIOS ? (
                <>
                  <Share className="w-5 h-5" />
                  {t('iosButton')}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t('installButton')}
                </>
              )}
            </Button>

            {/* Nota */}
            <p className="text-zinc-500 text-xs text-center mt-3">
              {t('features')}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Instruções iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-white font-semibold text-lg">
                {t('iosInstructions.title')}
              </h3>
              <Button
                onClick={() => setShowIOSInstructions(false)}
                variant="ghost"
                size="icon"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Instruções */}
            <div className="p-4 space-y-4">
              {/* Passo 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">
                    {t('iosInstructions.step1Title')} <Share className="w-4 h-4 inline mx-1" />
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {t('iosInstructions.step1Description')}
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">
                    {t('iosInstructions.step2Title')} <Plus className="w-4 h-4 inline mx-1" />
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {t('iosInstructions.step2Description')}
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">
                    {t('iosInstructions.step3Title')}
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {t('iosInstructions.step3Description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
              <Button
                onClick={() => setShowIOSInstructions(false)}
                variant="secondary"
                className="w-full py-3 px-4 rounded-xl"
              >
                {t('iosInstructions.confirmButton')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos de animação */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
}

export default InstallBanner;
