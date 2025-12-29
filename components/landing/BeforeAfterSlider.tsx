'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'Stencil',
  className = ''
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  }, []);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Global mouse/touch handlers for smoother dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    const handleGlobalEnd = () => setIsDragging(false);

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalEnd);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[4/3] overflow-hidden rounded-xl border-2 border-zinc-800 select-none group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Imagem "Depois" (fundo completo) */}
      <div className="absolute inset-0">
        <img
          src={afterImage}
          alt={afterLabel}
          className="w-full h-full object-cover object-center"
          draggable={false}
        />
        {/* Label "Depois" */}
        <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-lg">
          {afterLabel}
        </div>
      </div>

      {/* Imagem "Antes" (com clip-path) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          willChange: isDragging ? 'clip-path' : 'auto'
        }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="w-full h-full object-cover object-center"
          draggable={false}
        />
        {/* Label "Antes" */}
        {sliderPosition > 20 && (
          <div className="absolute top-4 left-4 bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-lg">
            {beforeLabel}
          </div>
        )}
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-emerald-500 z-10"
        style={{ 
          left: `${sliderPosition}%`,
          cursor: isDragging ? 'grabbing' : 'ew-resize'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* Círculo do handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-emerald-500 rounded-full shadow-2xl shadow-emerald-500/50 flex items-center justify-center cursor-inherit transition-transform hover:scale-110 active:scale-95">
          <div className="flex gap-1">
            <div className="w-0.5 h-4 bg-white rounded-full" />
            <div className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>
      </div>

      {/* Instruções (aparecem no hover) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-xs font-medium opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        Arraste para comparar
      </div>
    </div>
  );
}
