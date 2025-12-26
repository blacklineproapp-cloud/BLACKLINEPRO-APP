'use client';

import { useState, FormEvent } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, Lock, CreditCard } from 'lucide-react';

interface AddCardFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function AddCardForm({ onSuccess, onError }: AddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Processando...');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setLoadingText('Validando dados...');

    try {
      // Simular delay para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingText('Salvando cartão...');

      // Confirmar setup com Stripe (sem cobrança, só salva o cartão)
      const { error } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Erro ao salvar cartão');
        onError?.(error.message || 'Erro ao salvar cartão');
        setIsProcessing(false);
        return;
      }

      setLoadingText('Finalizando...');
      console.log('✅ Cartão adicionado com sucesso!');
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao adicionar cartão:', err);
      setErrorMessage(err.message || 'Erro ao salvar cartão');
      onError?.(err.message || 'Erro ao salvar cartão');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stripe Payment Element (modo setup) */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 relative">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card'],
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'BR',
                },
              },
            },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            <span>{loadingText}</span>
          </>
        ) : (
          <>
            <CreditCard size={20} />
            <span>Salvar Cartão</span>
          </>
        )}
      </button>

      {/* Security Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Lock size={12} />
        <span>Pagamento seguro via Stripe • Não cobramos nada agora</span>
      </div>
    </form>
  );
}
