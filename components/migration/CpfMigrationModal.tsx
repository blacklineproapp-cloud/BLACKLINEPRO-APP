'use client';

/**
 * CpfMigrationModal - Modal para solicitar CPF durante migração Stripe → Asaas
 *
 * Exibido automaticamente quando o usuário logado precisa fornecer CPF
 * para continuar com a assinatura após migração do Stripe
 */

import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, CreditCard } from 'lucide-react';

interface CpfMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPlan?: string;
  billingDay?: number;
}

// Formatação de CPF/CNPJ
function formatCpfCnpj(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 11) {
    // CPF: 000.000.000-00
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return cleaned
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

export default function CpfMigrationModal({
  isOpen,
  onClose,
  onSuccess,
  currentPlan = 'starter',
  billingDay = 1,
}: CpfMigrationModalProps) {
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus no input ao abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Bloquear scroll
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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, '');

    // Limitar a 14 caracteres (CNPJ)
    if (cleaned.length <= 14) {
      setCpfCnpj(formatCpfCnpj(cleaned));
    }

    setError('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    // Formatar telefone: (00) 00000-0000
    if (value.length <= 11) {
      const formatted = value
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
      setPhone(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/migration/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          name: name.trim() || undefined,
          phone: phone.replace(/\D/g, '') || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar');
      }

      setSuccess(true);

      // Aguardar 2 segundos e fechar
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Tela de sucesso
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Migração concluída!
          </h3>
          <p className="text-zinc-400">
            Sua assinatura foi migrada com sucesso.
            Você continuará com acesso completo ao StencilFlow.
          </p>
        </div>
      </div>
    );
  }

  const planNames: Record<string, string> = {
    legacy: 'Legacy',
    starter: 'Starter',
    pro: 'Pro',
    studio: 'Studio',
    enterprise: 'Enterprise',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Atualização de Pagamento
              </h2>
              <p className="text-emerald-100 text-sm">
                Precisamos do seu CPF para continuar
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Importante</p>
                <p className="text-blue-300/80">
                  Migramos nosso sistema de pagamento para melhor atendê-lo.
                  Seu plano <span className="font-semibold text-blue-200">{planNames[currentPlan] || 'Atual'}</span> será
                  mantido, com cobrança no dia <span className="font-semibold text-blue-200">{billingDay}</span> de cada mês.
                </p>
              </div>
            </div>
          </div>

          {/* CPF/CNPJ */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              CPF ou CNPJ <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={cpfCnpj}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              required
              disabled={isLoading}
            />
          </div>

          {/* Nome (opcional) */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Nome completo <span className="text-zinc-500">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Telefone (opcional) */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Telefone <span className="text-zinc-500">(opcional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || cpfCnpj.replace(/\D/g, '').length < 11}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar e Continuar'
            )}
          </button>

          {/* Disclaimer */}
          <p className="text-xs text-zinc-500 text-center">
            Seus dados são protegidos e usados apenas para fins de cobrança.
            Ao continuar, você concorda com nossos termos de uso.
          </p>
        </form>
      </div>
    </div>
  );
}
