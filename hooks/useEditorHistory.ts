import { useState, useCallback } from 'react';
import { EditorHistory, EditorHistoryState, AdjustControls } from '@/lib/stencil-types';

/**
 * Hook para gerenciar histórico de edições do editor (Undo/Redo)
 *
 * Mantém stack de até 20 estados com imagem + controles
 * Suporta Undo (Ctrl+Z) e Redo (Ctrl+Y)
 */

const MAX_HISTORY = 20;

interface UseEditorHistoryReturn {
  // Estado atual
  canUndo: boolean;
  canRedo: boolean;

  // Ações
  pushState: (image: string, controls: AdjustControls) => void;
  undo: () => EditorHistoryState | null;
  redo: () => EditorHistoryState | null;
  clear: () => void;

  // Debug
  historySize: number;
  currentIndex: number;
}

export function useEditorHistory(initialImage?: string, initialControls?: AdjustControls): UseEditorHistoryReturn {
  const [history, setHistory] = useState<EditorHistory>(() => {
    const states: EditorHistoryState[] = [];

    // Adicionar estado inicial se fornecido
    if (initialImage && initialControls) {
      states.push({
        image: initialImage,
        controls: initialControls,
        timestamp: Date.now()
      });
    }

    return {
      states,
      currentIndex: states.length - 1,
      maxHistory: MAX_HISTORY
    };
  });

  // Adicionar novo estado ao histórico
  const pushState = useCallback((image: string, controls: AdjustControls) => {
    setHistory((prev) => {
      // Remover estados futuros (se usuário deu undo e fez nova ação)
      const newStates = prev.states.slice(0, prev.currentIndex + 1);

      // Adicionar novo estado
      newStates.push({
        image,
        controls: { ...controls }, // Clone
        timestamp: Date.now()
      });

      // Limitar a MAX_HISTORY estados (remover mais antigos)
      if (newStates.length > MAX_HISTORY) {
        newStates.shift();
      }

      console.log('[History] Estado adicionado:', {
        totalStates: newStates.length,
        currentIndex: newStates.length - 1,
        canUndo: newStates.length > 1,
        canRedo: false
      });

      return {
        ...prev,
        states: newStates,
        currentIndex: newStates.length - 1
      };
    });
  }, []);

  // Desfazer (voltar para estado anterior)
  const undo = useCallback((): EditorHistoryState | null => {
    let previousState: EditorHistoryState | null = null;

    setHistory((prev) => {
      if (prev.currentIndex <= 0) {
        console.log('[History] Undo ignorado: já no primeiro estado');
        return prev; // Já no primeiro estado
      }

      const newIndex = prev.currentIndex - 1;
      previousState = prev.states[newIndex];

      console.log('[History] Undo:', {
        from: prev.currentIndex,
        to: newIndex,
        totalStates: prev.states.length,
        canUndo: newIndex > 0,
        canRedo: true
      });

      return {
        ...prev,
        currentIndex: newIndex
      };
    });

    return previousState;
  }, []);

  // Refazer (avançar para próximo estado)
  const redo = useCallback((): EditorHistoryState | null => {
    let nextState: EditorHistoryState | null = null;

    setHistory((prev) => {
      if (prev.currentIndex >= prev.states.length - 1) {
        console.log('[History] Redo ignorado: já no último estado');
        return prev; // Já no último estado
      }

      const newIndex = prev.currentIndex + 1;
      nextState = prev.states[newIndex];

      console.log('[History] Redo:', {
        from: prev.currentIndex,
        to: newIndex,
        totalStates: prev.states.length,
        canUndo: true,
        canRedo: newIndex < prev.states.length - 1
      });

      return {
        ...prev,
        currentIndex: newIndex
      };
    });

    return nextState;
  }, []);

  // Limpar histórico
  const clear = useCallback(() => {
    setHistory({
      states: [],
      currentIndex: -1,
      maxHistory: MAX_HISTORY
    });
  }, []);

  return {
    canUndo: history.currentIndex > 0,
    canRedo: history.currentIndex < history.states.length - 1,
    pushState,
    undo,
    redo,
    clear,
    historySize: history.states.length,
    currentIndex: history.currentIndex
  };
}
