'use client';

import { useState, useEffect } from 'react';
import { SignInButton } from '@clerk/nextjs';
import { Key, X, Cloud } from 'lucide-react';

const DISMISS_KEY = 'blp_banner_dismissed';

interface AnonymousBannerProps {
  apiKeySet?: boolean;
}

export default function AnonymousBanner({ apiKeySet = false }: AnonymousBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(isDismissed);
    setMounted(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (!mounted || dismissed) return null;

  return (
    <div className="w-full bg-zinc-900/80 backdrop-blur border-b border-zinc-800/60 px-4 py-2.5 flex items-center justify-between gap-3 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        {apiKeySet ? (
          <>
            <Cloud size={14} className="text-indigo-400 shrink-0" />
            <p className="text-xs text-zinc-400 truncate">
              Gerando com sua chave Gemini.{' '}
              <SignInButton mode="modal">
                <button className="text-indigo-400 hover:text-indigo-300 font-semibold underline-offset-2 hover:underline transition-colors">
                  Criar conta grátis para salvar na nuvem
                </button>
              </SignInButton>
            </p>
          </>
        ) : (
          <>
            <Key size={14} className="text-indigo-400 shrink-0" />
            <p className="text-xs text-zinc-400 truncate">
              Cole sua chave Gemini gratuita para gerar stencils ilimitados.{' '}
              <SignInButton mode="modal">
                <button className="text-indigo-400 hover:text-indigo-300 font-semibold underline-offset-2 hover:underline transition-colors">
                  Ou crie uma conta
                </button>
              </SignInButton>
            </p>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-zinc-400 hover:text-zinc-400 transition-colors"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
