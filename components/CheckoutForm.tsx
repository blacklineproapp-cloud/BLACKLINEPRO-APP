'use client';

import { useState, FormEvent } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Loader2, Lock, CreditCard } from 'lucide-react';

interface CheckoutFormProps {
  plan: 'starter' | 'pro' | 'studio';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function CheckoutForm({ plan, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Processando...');

  const planPrices = {
    starter: 'R$ 50',
    pro: 'R$ 100',
    studio: 'R$ 300',
  };

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
      setLoadingText('Processando pagamento...');

      // Confirmar pagamento com Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Erro ao processar pagamento');
        onError?.(error.message || 'Erro ao processar pagamento');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        setLoadingText('Ativando assinatura...');

        // Confirmar subscription no backend
        const confirmRes = await fetch('/api/payments/confirm-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (!confirmRes.ok) {
          const errorData = await confirmRes.json();
          throw new Error(errorData.error || 'Erro ao confirmar assinatura');
        }

        setLoadingText('Finalizando...');
        console.log('✅ Pagamento e assinatura confirmados!');
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setErrorMessage(err.message || 'Erro ao processar pagamento');
      onError?.(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stripe Payment Element */}
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
            <span>Assinar por {planPrices[plan]}/mês</span>
          </>
        )}
      </button>

      {/* Security Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Lock size={12} />
        <span>Pagamento seguro via Stripe • Cancele quando quiser</span>
      </div>
    </form>
  );
}
