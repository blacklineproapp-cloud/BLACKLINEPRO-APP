'use client';

import { useEffect, useRef, memo, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focar no botão cancelar ao abrir
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Prevenir scroll do body quando modal aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Click fora do modal para fechar
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Configuração de variantes
  const variantConfig = {
    danger: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      buttonText: 'text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      buttonText: 'text-white',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      buttonText: 'text-white',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      buttonText: 'text-white',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com ícone */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Ícone */}
            <div className={`flex-shrink-0 p-3 rounded-full ${config.bgColor} border-2 ${config.borderColor}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>

            {/* Título e descrição */}
            <div className="flex-1 pt-1">
              <h3 id="modal-title" className="text-lg font-semibold text-white mb-2">
                {title}
              </h3>
              <p id="modal-description" className="text-sm text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Botão fechar (X) */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-shrink-0 p-1 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="flex gap-3 p-6 pt-4 bg-zinc-950/50 rounded-b-xl border-t border-zinc-800">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>

          <button
            onClick={() => {
              onConfirm();
              // Não fechar automaticamente - deixar o pai controlar
            }}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${config.buttonText} ${config.buttonBg} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
