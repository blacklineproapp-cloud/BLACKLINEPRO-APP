'use client';

import { Check, Zap, Crown, Sparkles, Cloud, Key, BadgeCheck } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import AsaasCheckoutModal from '@/components/AsaasCheckoutModal';
import { BILLING_CYCLES, PLAN_PRICING, formatPrice, getMonthlyEquivalent } from '@/lib/billing/plans';
import { Button } from '@/components/ui/button';
import type { BillingCycle } from '@/lib/billing/types';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Blackline Free',
    description: 'Use sua chave Gemini gratuita',
    monthlyPrice: 0,
    storageLabel: 'Somente local',
    icon: Key,
    iconBg: 'bg-zinc-800 border-zinc-700',
    iconColor: 'text-zinc-400',
    gradient: 'from-zinc-900 to-zinc-950',
    border: 'border-zinc-700',
    buttonClass: 'bg-zinc-700 hover:bg-zinc-600 text-white',
    cta: 'Começar Grátis',
    freeAction: true,
    features: [
      'Gerações ilimitadas (BYOK)',
      'Editor + Generator completos',
      'Salvar local no navegador',
    ],
  },
  {
    id: 'ink' as const,
    name: 'Blackline Ink',
    description: 'Nuvem + sem anúncios',
    monthlyPrice: PLAN_PRICING.ink.monthly,
    storageLabel: '5 GB nuvem',
    icon: Cloud,
    iconBg: 'bg-indigo-900/20 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    gradient: 'from-indigo-900/10 to-zinc-900',
    border: 'border-zinc-700',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    cta: 'Assinar Ink',
    freeAction: false,
    features: [
      'Gerações ilimitadas (BYOK)',
      '5 GB de armazenamento em nuvem',
      'Sem anúncios',
      'Editor + Generator completos',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Blackline Pro',
    description: 'Para tatuadores profissionais',
    monthlyPrice: PLAN_PRICING.pro.monthly,
    storageLabel: '20 GB nuvem',
    icon: Crown,
    iconBg: 'bg-indigo-900/30 border-indigo-500/40',
    iconColor: 'text-indigo-400',
    gradient: 'from-indigo-900/20 to-zinc-900',
    border: 'border-indigo-500/60',
    buttonClass: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white',
    cta: 'Assinar Pro',
    freeAction: false,
    popular: true,
    features: [
      'Gerações ilimitadas (BYOK)',
      '20 GB de armazenamento em nuvem',
      'Sem anúncios',
      'Split A4, Color Match, Aprimorar 4K',
      'Generator de artes com IA',
      'Suporte prioritário',
    ],
  },
  {
    id: 'studio' as const,
    name: 'Blackline Studio',
    description: 'Para estúdios e times',
    monthlyPrice: PLAN_PRICING.studio.monthly,
    storageLabel: '100 GB nuvem',
    icon: Sparkles,
    iconBg: 'bg-zinc-800 border-zinc-700',
    iconColor: 'text-indigo-400',
    gradient: 'from-indigo-900/10 to-zinc-900',
    border: 'border-zinc-700',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    cta: 'Assinar Studio',
    freeAction: false,
    features: [
      'Tudo do Pro',
      '100 GB em nuvem + múltiplos usuários',
      'Relatórios de uso da equipe',
      'Onboarding personalizado',
      'Suporte prioritário + SLA',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [selectedPlan, setSelectedPlan] = useState<'ink' | 'pro' | 'studio' | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      router.push('/editor');
      return;
    }
    if (planId === 'ink' || planId === 'pro' || planId === 'studio') {
      setSelectedPlan(planId);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">

      {/* Hero */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <Key size={12} /> Gerações ilimitadas com sua chave Gemini gratuita
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Crie stencils{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              sem limites
            </span>
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto">
            Você usa sua chave Gemini gratuita do Google para gerar. Nós fornecemos o editor
            profissional, o armazenamento em nuvem e as ferramentas premium.
          </p>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mt-6 text-zinc-500 hover:text-zinc-300 text-sm"
          >
            ← Voltar ao painel
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6">

        {/* BYOK Info Bar */}
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="text-indigo-400" size={20} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Como funciona o modelo BYOK?</p>
            <p className="text-zinc-400 text-xs mt-1">
              Você obtém uma chave de API gratuita no{' '}
              <strong className="text-white">Google AI Studio</strong> e cola no app — é grátis e
              leva 2 minutos. O plano pago desbloqueia{' '}
              <strong className="text-white">armazenamento em nuvem</strong>, ferramentas premium e
              remove os anúncios.
            </p>
          </div>
        </div>

        {/* Billing Cycle Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl max-w-full">
            {(Object.entries(BILLING_CYCLES) as [BillingCycle, typeof BILLING_CYCLES[BillingCycle]][]).map(
              ([cycle, info]) => (
                <button
                  key={cycle}
                  onClick={() => setSelectedCycle(cycle)}
                  className={`relative px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    selectedCycle === cycle
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="whitespace-nowrap">{info.label}</span>
                    {info.discount > 0 && (
                      <span
                        className={`text-[9px] mt-0.5 ${
                          selectedCycle === cycle ? 'text-indigo-200' : 'text-indigo-400'
                        }`}
                      >
                        -{info.discount}%
                      </span>
                    )}
                  </div>
                </button>
              )
            )}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((pkg) => {
            const Icon = pkg.icon;
            const monthlyEquiv = pkg.id === 'free' ? 0 : getMonthlyEquivalent(pkg.id, selectedCycle);
            const totalPrice = pkg.id === 'free' ? 0 : PLAN_PRICING[pkg.id][selectedCycle];
            const savings =
              selectedCycle !== 'monthly' && pkg.id !== 'free'
                ? pkg.monthlyPrice - monthlyEquiv
                : 0;

            return (
              <div
                key={pkg.id}
                className={`bg-gradient-to-br ${pkg.gradient} border-2 ${pkg.border} rounded-2xl p-6 relative flex flex-col ${
                  pkg.popular ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                    Mais Popular
                  </div>
                )}

                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${pkg.iconBg}`}>
                  <Icon className={pkg.iconColor} size={20} />
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-zinc-500 text-xs mb-4">{pkg.description}</p>

                {/* Price */}
                <div className="mb-5">
                  {pkg.id === 'free' ? (
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black text-white">Grátis</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-black text-white">
                          {formatPrice(monthlyEquiv, locale)}
                        </span>
                        <span className="text-zinc-500 text-xs">/mês</span>
                      </div>
                      {selectedCycle !== 'monthly' && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-zinc-500">
                            {formatPrice(totalPrice, locale)} cobrado{' '}
                            {selectedCycle === 'quarterly'
                              ? 'trimestralmente'
                              : selectedCycle === 'semiannual'
                              ? 'semestralmente'
                              : 'anualmente'}
                          </p>
                          {savings > 0 && (
                            <p className="text-[10px] text-indigo-400 font-medium">
                              Economize {formatPrice(savings, locale)}/mês (
                              {BILLING_CYCLES[selectedCycle].discount}% off)
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Storage badge */}
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-2 py-0.5 rounded-md">
                    <Cloud size={9} /> {pkg.storageLabel}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-grow">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(pkg.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm shadow-md ${pkg.buttonClass}`}
                >
                  {pkg.cta}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-5">Perguntas Frequentes</h3>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-white font-semibold mb-1">O que é BYOK?</p>
              <p className="text-zinc-400">
                BYOK (Bring Your Own Key) significa que você usa sua própria chave de API do Google
                Gemini. A chave é gratuita — basta criar uma conta no Google AI Studio e copiar a
                chave.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">
                Por que pagar se as gerações são gratuitas?
              </p>
              <p className="text-zinc-400">
                O plano pago desbloqueia armazenamento em nuvem, ferramentas premium como Split A4 e
                Color Match, e remove os anúncios.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Posso cancelar a qualquer momento?</p>
              <p className="text-zinc-400">
                Sim. Sem fidelidade, sem multa. Você pode cancelar quando quiser e continuará com
                acesso até o fim do período pago.
              </p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Minha chave Gemini é segura?</p>
              <p className="text-zinc-400">
                Sua chave é armazenada apenas no localStorage do seu navegador — nunca vai para
                nossos servidores. Cada geração é feita diretamente do seu navegador para o Google.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <AsaasCheckoutModal
          plan={selectedPlan}
          cycle={selectedCycle}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}
