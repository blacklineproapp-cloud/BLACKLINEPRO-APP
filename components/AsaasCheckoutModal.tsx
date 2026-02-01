'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Crown, Zap, Sparkles, LogIn, CreditCard as CreditCardIcon, QrCode, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import { PLAN_PRICING, BILLING_CYCLES, formatPrice, getMonthlyEquivalent } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/stripe/types';
import type { CreditCardData, CreditCardHolderInfo } from '@/lib/asaas';

// Componentes Asaas
import PixQrCodeDisplay from './asaas/PixQrCodeDisplay';
import BoletoDisplay from './asaas/BoletoDisplay';
import CreditCardForm from './asaas/CreditCardForm';
import CpfCnpjInput from './asaas/CpfCnpjInput';

interface AsaasCheckoutModalProps {
  plan: 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy';
  cycle?: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'pix' | 'boleto' | 'credit_card';

export default function AsaasCheckoutModal({ plan, cycle = 'monthly', isOpen, onClose }: AsaasCheckoutModalProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  // Email do usuário logado para pré-preencher
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  
  // Estados
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  
  // Estados de resposta
  const [pixData, setPixData] = useState<any>(null);
  const [boletoData, setBoletoData] = useState<any>(null);
  const [cardData, setCardData] = useState<CreditCardData | null>(null);
  const [holderInfo, setHolderInfo] = useState<CreditCardHolderInfo | null>(null);
  const [success, setSuccess] = useState(false);

  const planDetails = {
    legacy: {
      name: 'Legacy',
      icon: Sparkles,
      color: 'orange',
      limit: '100 gerações/mês',
    },
    starter: {
      name: 'Starter',
      icon: Zap,
      color: 'emerald',
      limit: '95 gerações/mês',
    },
    pro: {
      name: 'Pro',
      icon: Crown,
      color: 'purple',
      limit: '210 gerações/mês',
    },
    studio: {
      name: 'Studio',
      icon: Sparkles,
      color: 'amber',
      limit: '680 gerações/mês',
    },
    enterprise: {
      name: 'Enterprise',
      icon: Sparkles,
      color: 'amber',
      limit: '1.400 gerações/mês',
    },
  };

  const details = planDetails[plan];
  const monthlyEquivalent = getMonthlyEquivalent(plan, cycle);
  const totalPrice = PLAN_PRICING[plan][cycle];
  const cycleInfo = BILLING_CYCLES[cycle];

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setPixData(null);
      setBoletoData(null);
      setSuccess(false);
      setError(null);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const body: any = {
        plan,
        cycle,
        paymentMethod,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, ''),
      };

      // Adicionar dados do cartão se for o método selecionado
      if (paymentMethod === 'credit_card' && cardData && holderInfo) {
        body.creditCard = cardData;
        body.creditCardHolderInfo = holderInfo;
      }

      const res = await fetch('/api/payments/asaas-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento');
      }

      const data = await res.json();

      // Processar resposta baseado no método
      if (paymentMethod === 'pix') {
        setPixData(data);
      } else if (paymentMethod === 'boleto') {
        setBoletoData(data);
      } else if (paymentMethod === 'credit_card') {
        // Cartão aprovado imediatamente
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard?activated=true');
          onClose();
        }, 2000);
      }

    } catch (err: any) {
      console.error('[Asaas Checkout] Erro:', err);
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardDataChange = (card: CreditCardData, holder: CreditCardHolderInfo) => {
    setCardData(card);
    setHolderInfo(holder);
  };

  const isFormValid = () => {
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) return false;
    if (paymentMethod === 'credit_card') {
      if (!cardData || !holderInfo) return false;
      if (!cardData.number || !cardData.holderName || !cardData.expiryMonth || !cardData.expiryYear || !cardData.ccv) return false;
      if (!holderInfo.email || !holderInfo.email.includes('@')) return false; // Email obrigatório para cartão
      if (!holderInfo.cpfCnpj || holderInfo.cpfCnpj.replace(/\D/g, '').length < 11) return false; // CPF obrigatório
      if (!holderInfo.postalCode || holderInfo.postalCode.replace(/\D/g, '').length < 8) return false; // CEP obrigatório (8 dígitos)
      if (!holderInfo.phone || holderInfo.phone.replace(/\D/g, '').length < 10) return false; // Telefone obrigatório (mínimo 10 dígitos)
    }
    return true;
  };

  if (!details) return null;
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
                details.color === 'orange' ? 'bg-orange-600/10 border border-orange-500/30' :
                details.color === 'emerald' ? 'bg-emerald-600/10 border border-emerald-500/30' :
                details.color === 'purple' ? 'bg-purple-600/10 border border-purple-500/30' :
                'bg-amber-600/10 border border-amber-500/30'
              }`}
            >
              <details.icon 
                className={
                  details.color === 'orange' ? 'text-orange-500' :
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

        {/* Content */}
        <div className="p-4 overflow-visible">
          {/* Login Required */}
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
            </div>
          )}

          {/* Success State */}
          {success && (
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
              <p className="text-zinc-400 text-sm">Redirecionando...</p>
            </div>
          )}

          {/* Checkout Form */}
          {isSignedIn && !success && !pixData && !boletoData && (
            <div className="space-y-4">
              {/* Seleção de Método */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-emerald-500 bg-emerald-600/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <QrCode className={paymentMethod === 'pix' ? 'text-emerald-500' : 'text-zinc-400'} size={24} />
                    <p className={`text-xs mt-1 ${paymentMethod === 'pix' ? 'text-emerald-400' : 'text-zinc-400'}`}>PIX</p>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('boleto')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'boleto'
                        ? 'border-amber-500 bg-amber-600/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <FileText className={paymentMethod === 'boleto' ? 'text-amber-500' : 'text-zinc-400'} size={24} />
                    <p className={`text-xs mt-1 ${paymentMethod === 'boleto' ? 'text-amber-400' : 'text-zinc-400'}`}>Boleto</p>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-purple-500 bg-purple-600/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <CreditCardIcon className={paymentMethod === 'credit_card' ? 'text-purple-500' : 'text-zinc-400'} size={24} />
                    <p className={`text-xs mt-1 ${paymentMethod === 'credit_card' ? 'text-purple-400' : 'text-zinc-400'}`}>Cartão</p>
                  </button>
                </div>
              </div>

              {/* CPF/CNPJ */}
              <CpfCnpjInput
                value={cpfCnpj}
                onChange={setCpfCnpj}
                required
              />

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Celular <span className="text-zinc-500">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    // Formatar telefone: (99) 99999-9999
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                      value = value.replace(/(\d{5})(\d)/, '$1-$2');
                    }
                    setPhone(value);
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  maxLength={15}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Para receber notificações do pagamento
                </p>
              </div>

              {/* Formulário de Cartão */}
              {paymentMethod === 'credit_card' && (
                <CreditCardForm
                  onDataChange={handleCardDataChange}
                  cpfCnpj={cpfCnpj}
                  userEmail={userEmail}
                />
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!isFormValid() || isLoading}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                  !isFormValid() || isLoading
                    ? 'bg-zinc-700 cursor-not-allowed'
                    : paymentMethod === 'pix'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : paymentMethod === 'boleto'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    Processando...
                  </span>
                ) : (
                  `Pagar ${formatPrice(totalPrice)}`
                )}
              </button>
            </div>
          )}

          {/* PIX Display */}
          {pixData && (
            <PixQrCodeDisplay
              encodedImage={pixData.pixQrCode.encodedImage}
              payload={pixData.pixQrCode.payload}
              expirationDate={pixData.pixQrCode.expirationDate}
              value={pixData.value}
            />
          )}

          {/* Boleto Display */}
          {boletoData && (
            <BoletoDisplay
              boletoUrl={boletoData.boletoUrl}
              invoiceUrl={boletoData.invoiceUrl}
              dueDate={boletoData.dueDate}
              value={boletoData.value}
            />
          )}
        </div>
      </div>
    </div>
  );
}
