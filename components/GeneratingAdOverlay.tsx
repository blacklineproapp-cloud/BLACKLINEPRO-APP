'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Clock, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdSlot from './AdSlot';
import { Button } from '@/components/ui/button';

interface GeneratingAdOverlayProps {
  /** Slot AdSense específico para esse formato */
  slot?: string;
  /** true enquanto a geração ainda está rodando */
  isGenerating: boolean;
  /** Chamado quando o usuário pode ver o resultado (countdown zerou + geração concluiu) */
  onReady: () => void;
}

const AD_DURATION = 8; // segundos obrigatórios

/**
 * Overlay de anúncio exibido durante a geração para usuários free.
 *
 * Lógica:
 * - Mostra contador regressivo de 8 segundos
 * - Exibe anúncio AdSense (ou promo do plano pago como fallback)
 * - Só libera o resultado quando: countdown zerou E geração concluiu
 */
export default function GeneratingAdOverlay({ slot = 'generating-overlay', isGenerating, onReady }: GeneratingAdOverlayProps) {
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [countdownDone, setCountdownDone] = useState(false);
  const router = useRouter();
  const readyCalled = useRef(false);

  // Countdown regressivo
  useEffect(() => {
    if (countdown <= 0) {
      setCountdownDone(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Liberar resultado quando ambos prontos
  useEffect(() => {
    if (countdownDone && !isGenerating && !readyCalled.current) {
      readyCalled.current = true;
      onReady();
    }
  }, [countdownDone, isGenerating, onReady]);

  const progress = ((AD_DURATION - countdown) / AD_DURATION) * 100;

  return (
    <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">

        {/* Status da geração */}
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          {isGenerating ? 'Gerando seu stencil...' : 'Stencil pronto!'}
        </div>

        {/* Countdown */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {countdownDone ? 'Aguardando geração...' : `Aguarde ${countdown}s`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Ad slot + fallback */}
        <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
          <p className="text-[9px] text-zinc-500 text-center pt-2 uppercase tracking-[0.2em]">Publicidade</p>
          {/* AdSense: renderiza quando aprovado. Fallback visual por baixo */}
          <div className="relative min-h-[200px]">
            <div className="relative z-10">
              <AdSlot slot={slot} format="rectangle" className="mx-auto" />
            </div>
            {/* Fallback visual — aparece atrás do AdSense quando vazio */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="w-14 h-14 opacity-20">
                <Image
                  src="/icon-192x192.png"
                  alt="Black Line Pro"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-zinc-600 text-[10px] font-semibold tracking-wider uppercase">
                Anuncie Aqui
              </p>
            </div>
          </div>
          {/* Promo do plano pago */}
          <div className="border-t border-zinc-800 p-4 text-center">
            <p className="text-white font-bold text-sm mb-1">Remova a espera</p>
            <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
              Plano Ink e acima: sem espera + armazenamento em nuvem.
            </p>
            <Button
              onClick={() => router.push('/pricing')}
              size="sm"
              className="w-full gap-2 text-xs py-2 px-4 rounded-lg"
            >
              <Crown size={12} />
              Ver planos
            </Button>
          </div>
        </div>

        {/* Skip info */}
        {!countdownDone && (
          <p className="text-zinc-400 text-[10px] text-center">
            Assine qualquer plano para pular os anúncios e ver o resultado imediatamente.
          </p>
        )}
      </div>
    </div>
  );
}
