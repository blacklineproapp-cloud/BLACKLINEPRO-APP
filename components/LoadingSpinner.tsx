'use client';

import { useState, useEffect } from 'react';
import { Search, ScanLine, Layers, Wand2, Brain, Paintbrush, Sparkles, Image } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  showSteps?: boolean;
  mode?: 'stencil' | 'image';
}

const STENCIL_STEPS = [
  { text: 'Analisando imagem...', Icon: Search },
  { text: 'Detectando contornos...', Icon: ScanLine },
  { text: 'Mapeando detalhes...', Icon: Layers },
  { text: 'Finalizando stencil...', Icon: Wand2 },
];

const IMAGE_STEPS = [
  { text: 'Processando prompt...', Icon: Brain },
  { text: 'Gerando conceito...', Icon: Paintbrush },
  { text: 'Aplicando detalhes...', Icon: Sparkles },
  { text: 'Finalizando imagem...', Icon: Image },
];

export default function LoadingSpinner({
  size = 'md',
  text,
  showSteps = false,
  mode = 'stencil',
}: LoadingSpinnerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = mode === 'image' ? IMAGE_STEPS : STENCIL_STEPS;

  useEffect(() => {
    if (!showSteps) return;

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 95));
    }, 150);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [showSteps, steps.length]);

  const ringSize = {
    sm: 'w-5  h-5  border-2',
    md: 'w-10 h-10 border-2',
    lg: 'w-14 h-14 border-2',
  };

  const iconSize = {
    sm: 10,
    md: 14,
    lg: 18,
  };

  const CurrentIcon = steps[currentStep].Icon;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Spinner ring + step icon */}
      <div className="relative flex items-center justify-center">
        <div
          className={`${ringSize[size]} border-zinc-800 border-t-indigo-500 rounded-full animate-spin`}
        />
        {showSteps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CurrentIcon
              size={iconSize[size]}
              className="text-indigo-400 animate-fade-in"
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      {/* Steps UI */}
      {showSteps ? (
        <div className="text-center space-y-3 w-52">
          <p className="text-zinc-300 text-sm font-medium tracking-tight animate-pulse">
            {steps[currentStep].text}
          </p>

          {/* Progress bar */}
          <div className="h-px bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`rounded-full transition-all duration-300 ${
                  idx < currentStep
                    ? 'w-1.5 h-1.5 bg-indigo-600'
                    : idx === currentStep
                    ? 'w-3 h-1.5 bg-indigo-500'
                    : 'w-1.5 h-1.5 bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        text && (
          <p className="text-zinc-500 text-xs tracking-wide animate-pulse">{text}</p>
        )
      )}
    </div>
  );
}

export { LoadingSpinner };
