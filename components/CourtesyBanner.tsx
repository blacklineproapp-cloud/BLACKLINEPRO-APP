'use client';

import { useState } from 'react';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface CourtesyBannerProps {
  deadline: string; // ISO date string
  assignedPlan: 'ink' | 'pro' | 'studio';
}

export default function CourtesyBanner({ deadline, assignedPlan }: CourtesyBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  if (isDismissed) return null;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Se passou do prazo, não mostrar banner
  if (daysRemaining < 0) return null;

  const isUrgent = daysRemaining <= 3;

  const handlePayment = () => {
    // Redirecionar para pricing com plano pré-selecionado
    router.push(`/pricing?plan=${assignedPlan}&courtesy=true`);
  };

  return (
    <div className={`relative border-2 rounded-xl p-4 mb-6 ${
      isUrgent 
        ? 'bg-red-900/20 border-red-500' 
        : 'bg-amber-900/20 border-amber-500'
    }`}>
      {/* Close Button */}
      <Button
        onClick={() => setIsDismissed(true)}
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3"
        aria-label="Fechar aviso"
      >
        <X size={18} />
      </Button>

      {/* Content */}
      <div className="flex items-start gap-4 pr-8">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUrgent 
            ? 'bg-red-600/20 border border-red-500/30' 
            : 'bg-amber-600/20 border border-amber-500/30'
        }`}>
          <AlertTriangle className={isUrgent ? 'text-red-400' : 'text-amber-400'} size={24} />
        </div>

        {/* Text */}
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg mb-1">
            {isUrgent ? '⚠️ Ação Urgente Necessária' : '📢 Aviso Importante'}
          </h3>
          
          <p className="text-zinc-300 text-sm mb-3">
            Sua <strong>cortesia permanente</strong> está ativa até{' '}
            <strong className={isUrgent ? 'text-red-400' : 'text-amber-400'}>
              {deadlineDate.toLocaleDateString('pt-BR')}
            </strong>
            {' '}({daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes).
          </p>

          <p className="text-zinc-400 text-sm mb-4">
            Para continuar usando o Black Line Pro após esta data, você precisa assinar o plano{' '}
            <strong className="text-white">{assignedPlan.toUpperCase()}</strong>.
          </p>

          {/* CTA Button */}
          <Button
            onClick={handlePayment}
            variant={isUrgent ? 'destructive' : 'default'}
            className="gap-2 px-4 py-2 rounded-lg shadow-lg"
          >
            <CreditCard size={18} />
            Assinar Agora
          </Button>
        </div>
      </div>
    </div>
  );
}
