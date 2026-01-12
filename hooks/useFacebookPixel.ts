'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook para gerenciar Facebook Pixel com debounce e rate limiting
 * Evita erro 429 (Too Many Requests)
 */
export function useFacebookPixel() {
  const eventQueueRef = useRef<Map<string, any>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventCountsRef = useRef<Map<string, number>>(new Map());
  
  const MAX_EVENTS_PER_TYPE = 10; // Máximo de eventos por tipo por sessão
  const DEBOUNCE_DELAY = 1000; // 1 segundo

  useEffect(() => {
    // Limpar timer ao desmontar
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const trackEvent = (eventName: string, data?: any) => {
    // Verificar limite de eventos
    const count = eventCountsRef.current.get(eventName) || 0;
    if (count >= MAX_EVENTS_PER_TYPE) {
      console.warn(`[FB Pixel] Limite atingido para evento: ${eventName}`);
      return;
    }

    // Adicionar à fila (sobrescreve evento anterior do mesmo tipo)
    eventQueueRef.current.set(eventName, data);

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Criar novo timer para enviar eventos em batch
    debounceTimerRef.current = setTimeout(() => {
      // Enviar todos os eventos únicos da fila
      eventQueueRef.current.forEach((eventData, name) => {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', name, eventData);
          
          // Incrementar contador
          const newCount = (eventCountsRef.current.get(name) || 0) + 1;
          eventCountsRef.current.set(name, newCount);
          
          console.log(`[FB Pixel] Evento enviado: ${name} (${newCount}/${MAX_EVENTS_PER_TYPE})`);
        }
      });

      // Limpar fila
      eventQueueRef.current.clear();
    }, DEBOUNCE_DELAY);
  };

  return { trackEvent };
}
