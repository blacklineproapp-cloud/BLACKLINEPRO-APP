'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { X, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import AddCardForm from './AddCardForm';
import { useRouter } from 'next/navigation';

// Lazy load Stripe - só carrega quando o modal é aberto
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!).catch((err) => {
      console.warn('[Stripe] Falha ao carregar Stripe.js:', err?.message);
      return null;
    });
  }
  return stripePromise;
};

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCardModal({ isOpen, onClose }: AddCardModalProps) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [stripeError, setStripeError] = useState(false);

  // Carregar Stripe quando modal abre
  useEffect(() => {
    if (isOpen) {
      getStripe().then((stripe) => {
        if (stripe) {
          setStripeInstance(stripe);
        } else {
          setStripeError(true);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      createSetupIntent();
      // Bloquear scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const createSetupIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/setup-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao criar setup');
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('Erro ao criar Setup Intent:', err);
      setError(err.message || 'Erro ao carregar formulário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    router.refresh(); // Atualizar dados do dashboard
    onClose();
    // Mostrar mensagem de sucesso
    alert('✅ Cartão adicionado com sucesso! Você será cobrado no dia 11/01/2025.');
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full my-8 sm:my-0 relative"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-600/10 border border-emerald-500/30">
              <CreditCard className="text-emerald-500" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Adicionar Cartão</h2>
              <p className="text-xs text-zinc-400">Não cobramos nada agora</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-visible">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Loader2 className="animate-spin text-emerald-500 mb-3" size={48} />
                <div className="absolute inset-0 animate-ping">
                  <Loader2 className="text-emerald-500/30" size={48} />
                </div>
              </div>
              <p className="text-white font-medium mt-4">Preparando formulário...</p>
              <p className="text-zinc-500 text-sm mt-1">Aguarde um momento</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={createSetupIntent}
                className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
              >
                ↻ Tentar novamente
              </button>
            </div>
          )}

          {/* Stripe Load Error */}
          {stripeError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-yellow-600/10 border border-yellow-500/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-yellow-500" size={28} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Formulário indisponível</h3>
              <p className="text-zinc-400 text-sm text-center mb-4 max-w-xs">
                O formulário de pagamento não pôde ser carregado. Isso pode acontecer se você tem um bloqueador de anúncios ativo.
              </p>
              <div className="flex flex-col gap-2 text-sm text-zinc-500">
                <p>Tente:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Desativar extensões de bloqueio</li>
                  <li>Usar outro navegador</li>
                  <li>Verificar sua conexão</li>
                </ul>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white transition"
              >
                ↻ Recarregar página
              </button>
            </div>
          )}

          {/* Add Card Form */}
          {clientSecret && stripeInstance && !isLoading && !stripeError && (
            <Elements
              stripe={stripeInstance}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#10b981',
                    colorBackground: '#18181b',
                    colorText: '#ffffff',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '12px',
                  },
                },
              }}
            >
              <AddCardForm onSuccess={handleSuccess} onError={handleError} />
            </Elements>
          )}

          {/* Info adicional */}
          {!isLoading && clientSecret && stripeInstance && !stripeError && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-semibold text-white mb-2">Por que adicionar agora?</h3>
              <div className="space-y-2 text-xs text-zinc-400">
                <p>• Seu período gratuito termina em <strong className="text-white">10 de Janeiro</strong></p>
                <p>• Adicionando o cartão agora, garantimos que você não perca acesso</p>
                <p>• <strong className="text-emerald-400">Primeira cobrança apenas no dia 11/01/2025</strong></p>
                <p>• Você pode cancelar a qualquer momento antes dessa data</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
