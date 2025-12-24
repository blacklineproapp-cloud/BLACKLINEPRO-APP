'use client';

import { useEffect } from 'react';

/**
 * Componente para registrar o Service Worker
 * Movido para o hook usePWA - este componente agora apenas importa o banner
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    // O registro do SW agora é feito pelo hook usePWA
    // Este componente existe apenas para manter compatibilidade
    
    if (typeof window === 'undefined') return;

    // Apenas logar se estamos em produção
    if (process.env.NODE_ENV === 'production') {
      console.log('[PWA] ServiceWorkerRegister montado - gerenciado pelo usePWA hook');
    }
  }, []);

  // Não renderiza nada - o InstallBanner é adicionado separadamente
  return null;
}
