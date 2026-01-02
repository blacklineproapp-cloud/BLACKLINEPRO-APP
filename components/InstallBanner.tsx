'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePWA } from '@/hooks/usePWA';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';

interface InstallBannerProps {
  /** Delay em ms antes de mostrar o banner (default: 3000) */
  delay?: number;
}

export function InstallBanner({ delay = 3000 }: InstallBannerProps) {
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
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                Instale o App
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Ícone do App */}
              <div className="flex-shrink-0 w-14 h-14 bg-black rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden">
                <Image 
                  src="/icon-192.png" 
                  alt="StencilFlow" 
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base">
                  StencilFlow
                </h3>
                <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">
                  Acesse mais rápido direto da sua tela inicial
                </p>
              </div>
            </div>

            {/* Botão de Instalar */}
            <button
              onClick={handleInstall}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isIOS ? (
                <>
                  <Share className="w-5 h-5" />
                  Como instalar
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Instalar App
                </>
              )}
            </button>

            {/* Nota */}
            <p className="text-zinc-500 text-xs text-center mt-3">
              Gratuito • Sem ocupar espaço • Funciona offline
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
                Instalar no iOS
              </h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruções */}
            <div className="p-4 space-y-4">
              {/* Passo 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">
                    Toque em <Share className="w-4 h-4 inline mx-1" /> Compartilhar
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    No Safari, toque no ícone de compartilhar na barra inferior
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">
                    Toque em <Plus className="w-4 h-4 inline mx-1" /> Adicionar à Tela de Início
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    Role para baixo no menu e selecione essa opção
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">
                    Confirme tocando em Adicionar
                  </p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    O app será instalado na sua tela inicial
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Entendi
              </button>
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
