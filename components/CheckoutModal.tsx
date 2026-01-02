'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { X, Loader2, Crown, Zap, Sparkles, LogIn } from 'lucide-react';
import CheckoutForm from './CheckoutForm';
import { useRouter } from 'next/navigation';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { PLAN_PRICING, BILLING_CYCLES, formatPrice, getMonthlyEquivalent } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/stripe/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutModalProps {
  plan: 'starter' | 'pro' | 'studio' | 'enterprise';
  cycle?: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ plan, cycle = 'monthly', isOpen, onClose }: CheckoutModalProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);

  const planDetails = {
    starter: {
      name: 'Starter',
      icon: Zap,
      color: 'emerald',
      limit: '100 gerações/mês',
    },
    pro: {
      name: 'Pro',
      icon: Crown,
      color: 'purple',
      limit: '500 gerações/mês',
    },
    studio: {
      name: 'Studio',
      icon: Sparkles,
      color: 'amber',
      limit: '1000 gerações/mês',
    },
    enterprise: {
      name: 'Enterprise',
      icon: Sparkles,
      color: 'amber',
      limit: 'Ilimitado',
    },
  };

  const details = planDetails[plan];

  // Calcular preços dinâmicos baseado no ciclo
  const monthlyEquivalent = getMonthlyEquivalent(plan, cycle);
  const totalPrice = PLAN_PRICING[plan][cycle];
  const cycleInfo = BILLING_CYCLES[cycle];

  const createPaymentIntent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao criar pagamento');
      }

      const data = await res.json();

      // Verificar se está em modo desenvolvimento
      if (data.devMode) {
        setDevMode(true);
        setIsLoading(false);
        // Auto-redirecionar após 2 segundos
        setTimeout(() => {
          router.push('/dashboard?plan=' + plan + '&cycle=' + cycle + '&activated=true');
          onClose();
        }, 2000);
        return;
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('Erro ao criar Payment Intent:', err);
      setError(err.message || 'Erro ao carregar checkout');
    } finally {
      setIsLoading(false);
    }
  }, [plan, cycle, router, onClose]);

  useEffect(() => {
    if (isOpen && isLoaded) {
      // Só cria payment intent se estiver logado
      if (isSignedIn) {
        createPaymentIntent();
      } else {
        setIsLoading(false);
      }
      // Bloquear scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isSignedIn, isLoaded, createPaymentIntent]);

  const handleSuccess = () => {
    router.push('/success?plan=' + plan + '&cycle=' + cycle);
    onClose();
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  // Validação: se plan inválido, não renderizar
  if (!details) {
    console.error('[CheckoutModal] Plan inválido:', plan);
    return null;
  }

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
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                details.color === 'emerald' ? 'bg-emerald-600/10 border border-emerald-500/30' :
                details.color === 'purple' ? 'bg-purple-600/10 border border-purple-500/30' :
                'bg-amber-600/10 border border-amber-500/30'
              }`}
            >
              <details.icon 
                className={
                  details.color === 'emerald' ? 'text-emerald-500' :
                  details.color === 'purple' ? 'text-purple-500' :
                  'text-amber-500'
                } 
                size={20} 
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{details.name}</h2>
              <p className="text-xs text-zinc-400">
                {formatPrice(monthlyEquivalent)}/mês
                {cycle !== 'monthly' && (
                  <span className="text-emerald-400 ml-1">
                    ({cycleInfo.label}: {formatPrice(totalPrice)})
                  </span>
                )}
                {' • '}{details.limit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Com overflow visible para dropdowns */}
        <div className="p-4 overflow-visible">
          {/* Login Required State */}
          {!isSignedIn && !isLoading && isLoaded && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-emerald-600/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
                <LogIn className="text-emerald-500" size={28} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Faça login para continuar</h3>
              <p className="text-zinc-400 text-sm text-center mb-6 max-w-xs">
                Para assinar o plano <strong className="text-white">{details.name}</strong>, você precisa criar uma conta ou fazer login.
              </p>
              <SignInButton mode="modal">
                <button className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                  details.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500' :
                  details.color === 'purple' ? 'bg-purple-600 hover:bg-purple-500' :
                  'bg-amber-600 hover:bg-amber-500'
                }`}>
                  Entrar ou Criar Conta
                </button>
              </SignInButton>
              <p className="text-zinc-500 text-xs mt-4">
                É grátis e leva menos de 1 minuto
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <Loader2 className="animate-spin text-emerald-500 mb-3" size={48} />
                <div className="absolute inset-0 animate-ping">
                  <Loader2 className="text-emerald-500/30" size={48} />
                </div>
              </div>
              <p className="text-white font-medium mt-4">Preparando checkout...</p>
              <p className="text-zinc-500 text-sm mt-1">Aguarde um momento</p>
            </div>
          )}

          {/* Dev Mode Success */}
          {devMode && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-emerald-600/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <svg
                  className="w-8 h-8 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-white font-bold text-lg mb-1">Plano Ativado!</p>
              <p className="text-zinc-400 text-sm">Modo desenvolvimento - redirecionando...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && !devMode && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={createPaymentIntent}
                className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
              >
                ↻ Tentar novamente
              </button>
            </div>
          )}

          {/* Checkout Form */}
          {clientSecret && !isLoading && !devMode && (
            <Elements
              stripe={stripePromise}
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
              <CheckoutForm plan={plan} cycle={cycle} onSuccess={handleSuccess} onError={handleError} />
            </Elements>
          )}

          {/* Plan Features - Compact version */}
          {!isLoading && !devMode && clientSecret && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-semibold text-white mb-2">Incluído no plano:</h3>
              <div className="flex flex-wrap gap-2">
                {plan === 'starter' && (
                  <>
                    <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md">
                      ✓ Editor Completo
                    </span>
                    <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md">
                      ✓ Modo Topográfico
                    </span>
                    <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md">
                      ✓ Linhas Perfeitas
                    </span>
                  </>
                )}
                {plan === 'pro' && (
                  <>
                    <span className="text-xs text-purple-500 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded-md">
                      ✓ Tudo do Starter
                    </span>
                    <span className="text-xs text-purple-500 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded-md">
                      ✓ IA Generativa
                    </span>
                    <span className="text-xs text-purple-500 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded-md">
                      ✓ Color Match + A4
                    </span>
                  </>
                )}
                {plan === 'studio' && (
                  <>
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                      ✓ Tudo do Pro
                    </span>
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                      ✓ 1000 Gerações/mês
                    </span>
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                      ✓ Suporte Prioritário
                    </span>
                  </>
                )}
                {plan === 'enterprise' && (
                  <>
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                      ✓ Tudo do Studio
                    </span>
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                      ✓ Uso Ilimitado
                    </span>
                    <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                      ✓ Suporte VIP
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
