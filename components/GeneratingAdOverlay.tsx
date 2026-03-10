'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Clock, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

        {/* Ad slot ou promo */}
        <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
          {process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? (
            <div className="p-1">
              <p className="text-[9px] text-zinc-400 text-center mb-1 uppercase tracking-widest">Publicidade</p>
              <AdSlot slot={slot} format="rectangle" className="mx-auto" />
            </div>
          ) : (
            /* Fallback: promo do plano pago */
            <div className="p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
                <Zap size={18} className="text-indigo-400" />
              </div>
              <p className="text-white font-bold text-sm mb-1">Remova os anúncios</p>
              <p className="text-zinc-400 text-xs mb-4 leading-relaxed">
                Usuários do plano Ink e acima pulam essa espera e têm armazenamento em nuvem incluído.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => router.push('/pricing')}
                  size="sm"
                  className="w-full gap-2 text-xs py-2 px-4 rounded-lg"
                >
                  <Crown size={12} />
                  Ver planos — a partir de R$ 29/mês
                </Button>
                <p className="text-zinc-400 text-[10px]">Sem fidelidade · Cancele quando quiser</p>
              </div>
            </div>
          )}
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
