/**
 * Hook para gerenciar histórico de desenho (Undo/Redo)
 * Otimizado para performance com limite de estados
 */

import { useState, useCallback, useRef } from 'react';
import type { Stroke, DrawingHistoryState } from '@/lib/drawing/types';

interface UseDrawingHistoryOptions {
  maxHistorySize?: number;
}

interface UseDrawingHistoryReturn {
  strokes: Stroke[];
  addStroke: (stroke: Stroke) => void;
  removeLastStroke: () => Stroke | null;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
  currentIndex: number;
  setStrokes: (strokes: Stroke[]) => void;
}

export function useDrawingHistory(
  options: UseDrawingHistoryOptions = {}
): UseDrawingHistoryReturn {
  const { maxHistorySize = 50 } = options;

  // Estado atual dos strokes
  const [strokes, setStrokesInternal] = useState<Stroke[]>([]);

  // Histórico para undo/redo
  const historyRef = useRef<DrawingHistoryState[]>([{ strokes: [], timestamp: Date.now() }]);
  const currentIndexRef = useRef(0);

  // Força re-render quando histórico muda
  const [, forceUpdate] = useState({});

  /**
   * Salva estado atual no histórico
   */
  const saveToHistory = useCallback((newStrokes: Stroke[]) => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    // Remove estados futuros se estamos no meio do histórico
    if (currentIndex < history.length - 1) {
      historyRef.current = history.slice(0, currentIndex + 1);
    }

    // Adiciona novo estado
    historyRef.current.push({
      strokes: [...newStrokes],
      timestamp: Date.now(),
    });

    // Limita tamanho do histórico
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current = historyRef.current.slice(-maxHistorySize);
    }

    currentIndexRef.current = historyRef.current.length - 1;
    forceUpdate({});
  }, [maxHistorySize]);

  /**
   * Adiciona um novo stroke
   */
  const addStroke = useCallback((stroke: Stroke) => {
    setStrokesInternal(prev => {
      const newStrokes = [...prev, stroke];
      saveToHistory(newStrokes);
      return newStrokes;
    });
  }, [saveToHistory]);

  /**
   * Remove o último stroke
   */
  const removeLastStroke = useCallback((): Stroke | null => {
    let removed: Stroke | null = null;

    setStrokesInternal(prev => {
      if (prev.length === 0) return prev;

      removed = prev[prev.length - 1];
      const newStrokes = prev.slice(0, -1);
      saveToHistory(newStrokes);
      return newStrokes;
    });

    return removed;
  }, [saveToHistory]);

  /**
   * Undo - volta ao estado anterior
   */
  const undo = useCallback((): boolean => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    if (currentIndex <= 0) return false;

    currentIndexRef.current = currentIndex - 1;
    const previousState = history[currentIndexRef.current];

    setStrokesInternal([...previousState.strokes]);
    forceUpdate({});

    return true;
  }, []);

  /**
   * Redo - avança para o próximo estado
   */
  const redo = useCallback((): boolean => {
    const history = historyRef.current;
    const currentIndex = currentIndexRef.current;

    if (currentIndex >= history.length - 1) return false;

    currentIndexRef.current = currentIndex + 1;
    const nextState = history[currentIndexRef.current];

    setStrokesInternal([...nextState.strokes]);
    forceUpdate({});

    return true;
  }, []);

  /**
   * Limpa todos os strokes e histórico
   */
  const clear = useCallback(() => {
    setStrokesInternal([]);
    historyRef.current = [{ strokes: [], timestamp: Date.now() }];
    currentIndexRef.current = 0;
    forceUpdate({});
  }, []);

  /**
   * Define strokes diretamente (útil para carregar estado)
   */
  const setStrokes = useCallback((newStrokes: Stroke[]) => {
    setStrokesInternal(newStrokes);
    saveToHistory(newStrokes);
  }, [saveToHistory]);

  return {
    strokes,
    addStroke,
    removeLastStroke,
    undo,
    redo,
    clear,
    canUndo: currentIndexRef.current > 0,
    canRedo: currentIndexRef.current < historyRef.current.length - 1,
    historySize: historyRef.current.length,
    currentIndex: currentIndexRef.current,
    setStrokes,
  };
}
