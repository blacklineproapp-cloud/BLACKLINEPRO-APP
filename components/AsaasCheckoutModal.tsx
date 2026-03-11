'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Crown, Zap, Sparkles, LogIn, CreditCard as CreditCardIcon, QrCode, FileText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import { PLAN_PRICING, BILLING_CYCLES, formatPrice, getMonthlyEquivalent } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/billing/types';
import type { CreditCardData, CreditCardHolderInfo } from '@/lib/asaas';

// Componentes Asaas
import PixQrCodeDisplay from './asaas/PixQrCodeDisplay';
import BoletoDisplay from './asaas/BoletoDisplay';
import CreditCardForm from './asaas/CreditCardForm';
import CpfCnpjInput from './asaas/CpfCnpjInput';
import { Button } from '@/components/ui/button';

interface AsaasCheckoutModalProps {
  plan: 'ink' | 'pro' | 'studio';
  cycle?: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'pix' | 'boleto' | 'credit_card';

export default function AsaasCheckoutModal({ plan, cycle = 'monthly', isOpen, onClose }: AsaasCheckoutModalProps) {
  const t = useTranslations('checkout');
  const tPricing = useTranslations('PricingPage');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
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
    ink: {
      name: 'Blackline Ink',
      icon: Zap,
      color: 'indigo',
      limit: '5 GB nuvem • Sem anúncios',
    },
    pro: {
      name: 'Blackline Pro',
      icon: Crown,
      color: 'indigo',
      limit: '10 GB nuvem • Ferramentas premium',
    },
    studio: {
      name: 'Blackline Studio',
      icon: Sparkles,
      color: 'amber',
      limit: '25 GB nuvem • Multi-usuário',
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

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('error');
      setError(errorMessage);
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
                details.color === 'indigo' ? 'bg-indigo-600/10 border border-indigo-500/30' :
                details.color === 'indigo' ? 'bg-indigo-600/10 border border-indigo-500/30' :
                'bg-amber-600/10 border border-amber-500/30'
              }`}
            >
              <details.icon 
                className={
                  details.color === 'orange' ? 'text-orange-500' :
                  details.color === 'indigo' ? 'text-indigo-500' :
                  details.color === 'indigo' ? 'text-indigo-500' :
                  'text-amber-500'
                } 
                size={20} 
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{details.name}</h2>
              <p className="text-xs text-zinc-400">
                {formatPrice(monthlyEquivalent, locale)}/{tPricing('perMonth')}
                {cycle !== 'monthly' && (
                  <span className="text-indigo-400 ml-1">
                    ({tPricing(`cycles.${cycle}`)}: {formatPrice(totalPrice, locale)})
                  </span>
                )}
                {' • '}{details.limit}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-visible">
          {/* Login Required */}
          {!isSignedIn && !isLoading && isLoaded && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/30 rounded-full flex items-center justify-center mb-4">
                <LogIn className="text-indigo-500" size={28} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{t('loginRequired.title')}</h3>
              <p className="text-zinc-400 text-sm text-center mb-6 max-w-xs">
                {t('loginRequired.desc', { plan: details.name })}
              </p>
              <SignInButton mode="modal">
                <button className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                  details.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-500' :
                  details.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-500' :
                  'bg-amber-600 hover:bg-amber-500'
                }`}>
                  {t('loginRequired.button')}
                </button>
              </SignInButton>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/30 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <svg
                  className="w-8 h-8 text-indigo-500"
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
               <p className="text-white font-bold text-lg mb-1">{t('success.title')}</p>
              <p className="text-zinc-400 text-sm">{t('success.redirecting')}</p>
            </div>
          )}

          {/* Checkout Form */}
          {isSignedIn && !success && !pixData && !boletoData && (
            <div className="space-y-4">
              {/* Seleção de Método */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  {t('paymentMethod.label')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-indigo-500 bg-indigo-600/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <QrCode className={paymentMethod === 'pix' ? 'text-indigo-500' : 'text-zinc-400'} size={24} />
                    <p className={`text-xs mt-1 ${paymentMethod === 'pix' ? 'text-indigo-400' : 'text-zinc-400'}`}>{t('paymentMethod.pix')}</p>
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
                    <p className={`text-xs mt-1 ${paymentMethod === 'boleto' ? 'text-amber-400' : 'text-zinc-400'}`}>{t('paymentMethod.boleto')}</p>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-indigo-500 bg-indigo-600/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                    }`}
                  >
                    <CreditCardIcon className={paymentMethod === 'credit_card' ? 'text-indigo-500' : 'text-zinc-400'} size={24} />
                    <p className={`text-xs mt-1 ${paymentMethod === 'credit_card' ? 'text-indigo-400' : 'text-zinc-400'}`}>{t('paymentMethod.card')}</p>
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
                  {t('phone.label')} <span className="text-zinc-500">{t('phone.optional')}</span>
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
                  placeholder={t('phone.placeholder')}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  maxLength={15}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {t('phone.desc')}
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
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || isLoading}
                className={`w-full py-3 rounded-xl shadow-lg ${
                  !isFormValid() || isLoading
                    ? 'bg-zinc-700 cursor-not-allowed'
                    : paymentMethod === 'pix'
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : paymentMethod === 'boleto'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    {t('processing')}
                  </span>
                ) : (
                  t('payAmount', { amount: formatPrice(totalPrice, locale) })
                )}
              </Button>
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
