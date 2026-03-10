'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import ModalWrapper from '@/components/ui/ModalWrapper';
import { Button } from '@/components/ui/button';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, feedback: string) => Promise<void>;
  isLoading: boolean;
}

const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Achou o preço alto' },
  { id: 'not_using', label: 'Não estou usando o suficiente' },
  { id: 'missing_features', label: 'Faltam recursos que eu preciso' },
  { id: 'found_better', label: 'Encontrei outra ferramenta melhor' },
  { id: 'other', label: 'Outro motivo' },
];

export default function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) return;
    await onConfirm(selectedReason, feedback);
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      preventClose={isLoading}
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 id="modal-title" className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} />
            Cancelar Assinatura
          </h3>
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="ghost"
            size="icon"
          >
            <X size={24} />
          </Button>
        </div>
        <p className="text-zinc-400 text-sm">
          Tem certeza que deseja cancelar? Você continuará com acesso até o fim do período atual.
          Por favor, nos conte o motivo:
        </p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          {CANCELLATION_REASONS.map((reason) => (
            <label
              key={reason.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedReason === reason.id
                  ? 'bg-red-500/10 border-red-500/50 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name="cancellation-reason"
                value={reason.id}
                checked={selectedReason === reason.id}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-4 h-4 text-red-500 border-zinc-700 focus:ring-red-500 bg-transparent"
              />
              <span className="text-sm font-medium">{reason.label}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Comentários adicionais (opcional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="O que poderíamos ter feito melhor?"
            className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-400 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-0 flex gap-3">
        <Button
          onClick={onClose}
          disabled={isLoading}
          variant="secondary"
          className="flex-1 px-4 py-3 rounded-xl"
        >
          Manter Assinatura
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedReason || isLoading}
          variant="destructive"
          className="flex-1 px-4 py-3 rounded-xl gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Cancelando...
            </>
          ) : (
            'Confirmar Cancelamento'
          )}
        </Button>
      </div>
    </ModalWrapper>
  );
}
