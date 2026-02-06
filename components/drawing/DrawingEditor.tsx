'use client';

/**
 * DrawingEditor - Editor de desenho completo
 * Combina canvas, toolbar e funcionalidades de exportação
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { X, Maximize2, Minimize2, Info } from 'lucide-react';
import DrawingCanvas, { DrawingCanvasRef } from './DrawingCanvas';
import DrawingToolbar from './DrawingToolbar';
import type { DrawingTool, Stroke } from '@/lib/drawing/types';

interface DrawingEditorProps {
  originalImage: string;       // Imagem original (referência visual)
  stencilImage: string;        // Stencil gerado (onde desenha)
  width: number;
  height: number;
  onClose: () => void;
  onSave: (imageDataUrl: string, strokes: Stroke[]) => void;
  className?: string;
}

export default function DrawingEditor({
  originalImage,
  stencilImage,
  width,
  height,
  onClose,
  onSave,
  className = '',
}: DrawingEditorProps) {
  const canvasRef = useRef<DrawingCanvasRef>(null);

  // Estado das ferramentas
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState('#000000');

  // Controle de opacidade do stencil (blend)
  const [stencilOpacity, setStencilOpacity] = useState(80);

  // Estado do histórico
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  // Estado de UI
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTips, setShowTips] = useState(true);

  // Dimensões do canvas são as dimensões reais da imagem
  // A visualização é controlada por CSS para manter a precisão do traço
  const [displaySize, setDisplaySize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDisplaySize = () => {
      const maxWidth = isFullscreen ? window.innerWidth - 100 : Math.min(800, window.innerWidth - 40);
      const maxHeight = isFullscreen ? window.innerHeight - 150 : Math.min(600, window.innerHeight - 200);

      const aspectRatio = width / height;
      let displayWidth = maxWidth;
      let displayHeight = maxWidth / aspectRatio;

      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      }

      setDisplaySize({
        width: Math.round(displayWidth),
        height: Math.round(displayHeight),
      });
    };

    updateDisplaySize();
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [width, height, isFullscreen]);

  // Atualizar estado do histórico quando strokes mudam
  const handleStrokesChange = useCallback((strokes: Stroke[]) => {
    setStrokeCount(strokes.length);
  }, []);

  // Atualizar canUndo/canRedo periodicamente
  useEffect(() => {
    const checkHistory = () => {
      // Esta é uma simplificação - na prática o canvas mantém o estado
      setCanUndo(strokeCount > 0);
    };
    checkHistory();
  }, [strokeCount]);

  // Handlers
  const handleUndo = useCallback(() => {
    const result = canvasRef.current?.undo();
    if (result) {
      setStrokeCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const handleRedo = useCallback(() => {
    const result = canvasRef.current?.redo();
    if (result) {
      setStrokeCount((prev) => prev + 1);
    }
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('Limpar todos os desenhos?')) {
      canvasRef.current?.clear();
      setStrokeCount(0);
    }
  }, []);

  const handleDownload = useCallback(() => {
    // Usar exportStencilOnly para não incluir a imagem original de referência
    const dataUrl = canvasRef.current?.exportStencilOnly();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `stencil-editado-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleSave = useCallback(() => {
    // Usar exportStencilOnly para não incluir a imagem original de referência
    const dataUrl = canvasRef.current?.exportStencilOnly();
    const strokes = canvasRef.current?.getStrokes() || [];
    if (dataUrl) {
      onSave(dataUrl, strokes);
    }
  }, [onSave]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          setTool('pen');
          break;
        case 'e':
          setTool('eraser');
          break;
        case 'l':
          setTool('line');
          break;
        case 'escape':
          onClose();
          break;
        case '[':
          setBrushSize((prev) => Math.max(1, prev - 1));
          break;
        case ']':
          setBrushSize((prev) => Math.min(10, prev + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isFullscreen ? 'w-full h-full' : 'max-w-[95vw] max-h-[95vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold">Modo Desenho</h2>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
              {strokeCount} traço{strokeCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle tips */}
            <button
              onClick={() => setShowTips(!showTips)}
              className={`p-2 rounded-lg transition-all ${
                showTips
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Mostrar dicas"
            >
              <Info size={18} />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
              title={isFullscreen ? 'Sair do fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-red-900/50 hover:text-red-400 transition-all"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tips banner */}
        {showTips && (
          <div className="bg-blue-900/20 border-b border-blue-800/30 px-4 py-2">
            <div className="flex items-center gap-2 text-blue-300 text-xs">
              <Info size={14} />
              <span>
                Use <strong>Apple Pencil</strong> ou <strong>caneta</strong> para desenhar com pressão.
                Atalhos: <kbd className="bg-blue-800/30 px-1 rounded">P</kbd> Caneta,{' '}
                <kbd className="bg-blue-800/30 px-1 rounded">E</kbd> Borracha,{' '}
                <kbd className="bg-blue-800/30 px-1 rounded">[ ]</kbd> Tamanho
              </span>
              <button
                onClick={() => setShowTips(false)}
                className="ml-auto text-blue-400 hover:text-blue-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar - Desktop */}
          <div className="hidden lg:block p-3 border-r border-zinc-800 bg-zinc-950">
            <DrawingToolbar
              tool={tool}
              onToolChange={setTool}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              brushColor={brushColor}
              onBrushColorChange={setBrushColor}
              stencilOpacity={stencilOpacity}
              onStencilOpacityChange={setStencilOpacity}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClear}
              onDownload={handleDownload}
            />
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center p-4 bg-zinc-950/50 overflow-auto">
            <div
              className="relative shadow-2xl rounded-lg overflow-hidden border border-zinc-700"
              style={{
                width: displaySize.width,
                height: displaySize.height,
              }}
            >
              <DrawingCanvas
                ref={canvasRef}
                width={width}
                height={height}
                originalImage={originalImage}
                stencilImage={stencilImage}
                stencilOpacity={stencilOpacity}
                tool={tool}
                brushSize={brushSize}
                brushColor={brushColor}
                onStrokesChange={handleStrokesChange}
              />
            </div>
          </div>
        </div>

        {/* Toolbar - Mobile */}
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950 p-2">
          <DrawingToolbar
            tool={tool}
            onToolChange={setTool}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            brushColor={brushColor}
            onBrushColorChange={setBrushColor}
            stencilOpacity={stencilOpacity}
            onStencilOpacityChange={setStencilOpacity}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            onDownload={handleDownload}
            compact
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Baixar PNG
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              Salvar e Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
