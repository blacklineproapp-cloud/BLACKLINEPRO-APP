'use client';

import { useRef, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import ModalWrapper from './ModalWrapper';

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

const variantConfig = {
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    buttonBg: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
  },
};

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
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [isOpen]);

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      preventClose={isLoading}
    >
      {/* Header com ícone */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-full ${config.bgColor} border-2 ${config.borderColor}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>

          <div className="flex-1 pt-1">
            <h3 id="modal-title" className="text-lg font-semibold text-white mb-2">
              {title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-zinc-800"
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
          className="flex-1 px-4 py-2.5 min-h-[44px] text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>

        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white ${config.buttonBg} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
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
    </ModalWrapper>
  );
}
