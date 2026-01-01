import { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  showSteps?: boolean;
  mode?: 'stencil' | 'image';
}

// Etapas para geração de STENCIL (Editor)
const STENCIL_STEPS = [
  { text: 'Analisando imagem...', emoji: '🔍' },
  { text: 'Detectando contornos...', emoji: '✏️' },
  { text: 'Mapeando detalhes...', emoji: '🎨' },
  { text: 'Finalizando stencil...', emoji: '✨' },
];

// Etapas para geração de IMAGEM (IA Gen)
const IMAGE_STEPS = [
  { text: 'Processando prompt...', emoji: '💭' },
  { text: 'Gerando conceito...', emoji: '🎨' },
  { text: 'Aplicando detalhes...', emoji: '✨' },
  { text: 'Finalizando imagem...', emoji: '🖼️' },
];

export default function LoadingSpinner({ size = 'md', text, showSteps = false, mode = 'stencil' }: LoadingSpinnerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Escolher steps baseado no modo
  const steps = mode === 'image' ? IMAGE_STEPS : STENCIL_STEPS;

  useEffect(() => {
    if (!showSteps) return;
    
    // Avançar etapas a cada 3s
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);

    // Barra de progresso suave
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 95));
    }, 150);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [showSteps, steps.length]);

  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Spinner principal */}
      <div className="relative">
        <div
          className={`${sizes[size]} border-zinc-700 border-t-emerald-500 rounded-full animate-spin`}
        ></div>
        {showSteps && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg animate-bounce">{steps[currentStep].emoji}</span>
          </div>
        )}
      </div>
      
      {/* Texto ou Etapas */}
      {showSteps ? (
        <div className="text-center space-y-3 w-48">
          <p className="text-zinc-300 text-sm font-medium animate-pulse">
            {steps[currentStep].text}
          </p>
          
          {/* Barra de progresso */}
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Indicadores de etapa */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_: { text: string; emoji: string }, idx: number) => (
              <div 
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>
      ) : text && (
        <p className="text-zinc-400 text-sm animate-pulse">{text}</p>
      )}
    </div>
  );
}

// Named export for compatibility
export { LoadingSpinner };

