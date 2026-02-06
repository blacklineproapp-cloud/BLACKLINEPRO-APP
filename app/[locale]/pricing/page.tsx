'use client';

import { Check, Zap, Crown, Sparkles, Package, Infinity } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import AsaasCheckoutModal from '@/components/AsaasCheckoutModal';
import { BILLING_CYCLES, PLAN_PRICING, formatPrice, getMonthlyEquivalent, PLAN_GENERATION_LIMITS } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/billing/types';

export default function PricingPage() {
  const t = useTranslations('PricingPage');
  const tCommon = useTranslations('common');
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'studio' | 'enterprise' | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectPlan = (planId: string) => {
    // Abre o modal mesmo sem estar logado
    // O modal vai mostrar mensagem pedindo login se necessário
    if (planId === 'starter' || planId === 'pro' || planId === 'studio' || planId === 'enterprise') {
      setSelectedPlan(planId);
      setIsModalOpen(true);
    }
  };

  const packages = [
    {
      id: 'starter',
      name: t('plans.starter.name'),
      basePrice: PLAN_PRICING.starter.monthly,
      limit: t('plans.starter.limit', { count: PLAN_GENERATION_LIMITS.starter ?? 0 }),
      description: t('plans.starter.description'),
      icon: Zap,
      iconColor: 'text-emerald-400',
      bgGradient: 'from-emerald-900/20 to-zinc-900',
      borderColor: 'border-emerald-500/50',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-500',
      features: [
        tCommon('features.editor'),
        tCommon('features.topographic'),
        tCommon('features.perfectLines'),
        tCommon('features.intensity'),
        tCommon('features.size'),
        tCommon('features.saveProjects'),
        tCommon('features.downloadHQ'),
      ],
    },
    {
      id: 'pro',
      name: t('plans.pro.name'),
      basePrice: PLAN_PRICING.pro.monthly,
      limit: t('plans.pro.limit', { count: PLAN_GENERATION_LIMITS.pro ?? 0 }),
      description: t('plans.pro.description'),
      icon: Crown,
      iconColor: 'text-purple-400',
      bgGradient: 'from-purple-900/20 to-zinc-900',
      borderColor: 'border-purple-500',
      buttonColor: 'bg-purple-600 hover:bg-purple-500',
      popular: true,
      features: [
        tCommon('features.everythingStarter'),
        tCommon('features.aiGen'),
        tCommon('features.upscale'),
        tCommon('features.colorMatch'),
        tCommon('features.splitA4'),
        tCommon('features.overlap'),
        tCommon('features.gridPreview'),
        tCommon('features.exportMulti'),
      ],
    },
    {
      id: 'studio',
      name: t('plans.studio.name'),
      basePrice: PLAN_PRICING.studio.monthly,
      limit: t('plans.studio.limit', { count: PLAN_GENERATION_LIMITS.studio ?? 0 }),
      description: t('plans.studio.description'),
      icon: Sparkles,
      iconColor: 'text-amber-400',
      bgGradient: 'from-amber-900/20 to-zinc-900',
      borderColor: 'border-amber-500',
      buttonColor: 'bg-amber-600 hover:bg-amber-500',
      features: [
        tCommon('features.everythingPro'),
        t('plans.studio.limit', { count: PLAN_GENERATION_LIMITS.studio ?? 0 }),
        tCommon('features.prioritySupport'),
        tCommon('features.idealStudios'),
        tCommon('features.multiArtist'),
        tCommon('features.usageReports'),
        tCommon('features.advPreview'),
        tCommon('features.fullTools'),
      ],
    },
    {
      id: 'enterprise',
      name: t('plans.enterprise.name'),
      basePrice: PLAN_PRICING.enterprise.monthly,
      limit: t('plans.enterprise.limit', { count: PLAN_GENERATION_LIMITS.enterprise ?? 0 }),
      description: t('plans.enterprise.description'),
      icon: Package,
      iconColor: 'text-blue-400',
      bgGradient: 'from-blue-900/20 to-zinc-900',
      borderColor: 'border-blue-500',
      buttonColor: 'bg-blue-600 hover:bg-blue-500',
      features: [
        tCommon('features.everythingStudio'),
        t('plans.enterprise.limit', { count: PLAN_GENERATION_LIMITS.enterprise ?? 0 }),
        tCommon('features.dedicatedSupport'),
        tCommon('features.sla'),
        tCommon('features.onboarding'),
        tCommon('features.apiAccess'),
        tCommon('features.integration'),
        tCommon('features.exclusiveService'),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {t('title')}
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              ← {t('back')}
            </button>
          </div>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Billing Cycle Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl max-w-full">
            {(Object.entries(BILLING_CYCLES) as [BillingCycle, typeof BILLING_CYCLES[BillingCycle]][]).map(([cycle, info]) => (
              <button
                key={cycle}
                onClick={() => setSelectedCycle(cycle)}
                className={`relative px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  selectedCycle === cycle
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="whitespace-nowrap">{t(`cycles.${cycle}`)}</span>
                  {info.badge && (
                    <span className={`text-[9px] sm:text-[10px] mt-0.5 hidden sm:inline ${
                      selectedCycle === cycle ? 'text-emerald-200' : 'text-emerald-400'
                    }`}>
                      {cycle === 'yearly' ? t('cycles.bestOffer') : t('cycles.save', { percent: info.discount })}
                    </span>
                  )}
                  {info.discount > 0 && (
                    <span className="text-[9px] text-emerald-400 mt-0.5 sm:hidden">-{info.discount}%</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Como Funciona */}
        <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center flex-shrink-0">
              <Package className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">{t('howItWorks.title')}</h2>
              <p className="text-sm text-zinc-400 mb-3">
                {t('howItWorks.desc')}
              </p>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>• <strong className="text-white">{t('howItWorks.recurrent')}</strong></li>
                <li>• {t('howItWorks.cancelAnytime')}</li>
                <li>• {t('howItWorks.limitsRenew')}</li>
                <li>• {t('howItWorks.immediateAccess')}</li>
                {selectedCycle !== 'monthly' && (
                  <li className="text-emerald-400">
                    • <strong>{t('howItWorks.savePercent', { percent: BILLING_CYCLES[selectedCycle].discount, cycle: t(`cycles.${selectedCycle}`).toLowerCase() })}</strong>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {packages.map((pkg) => {
            const pricing = PLAN_PRICING[pkg.id as 'starter' | 'pro' | 'studio' | 'enterprise'];
            const totalPrice = pricing[selectedCycle];
            const monthlyEquivalent = getMonthlyEquivalent(pkg.id as 'starter' | 'pro' | 'studio' | 'enterprise', selectedCycle);
            const savings = selectedCycle !== 'monthly' ? pkg.basePrice - monthlyEquivalent : 0;

            return (
              <div
                key={pkg.id}
                className={`relative bg-gradient-to-br ${pkg.bgGradient} border-2 ${pkg.borderColor} rounded-2xl p-6 sm:p-8 flex flex-col ${
                  pkg.popular ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''
                }`}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Crown size={12} />
                      {t('popular')}
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                    pkg.id === 'starter' ? 'bg-emerald-600/10 border border-emerald-500/30' :
                    pkg.id === 'pro' ? 'bg-purple-600/10 border border-purple-500/30' :
                    'bg-amber-600/10 border border-amber-500/30'
                  }`}
                >
                  <pkg.icon className={pkg.iconColor} size={28} />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{pkg.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(monthlyEquivalent, locale)}
                    </span>
                    <span className="text-zinc-500 text-sm">{t('perMonth')}</span>
                  </div>
                  {selectedCycle !== 'monthly' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-zinc-500">
                        {t('billingPeriod', { period: t(`cycles.${selectedCycle}`).toLowerCase(), price: formatPrice(totalPrice, locale) })}
                      </p>
                      <p className="text-xs text-emerald-400 font-medium">
                        {t('savings', { price: formatPrice(savings, locale), percent: BILLING_CYCLES[selectedCycle].discount })}
                      </p>
                    </div>
                  )}
                  <p className="text-zinc-500 text-xs mt-2">{pkg.limit}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(pkg.id)}
                  className={`w-full ${pkg.buttonColor} text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg`}
                >
                  {t('subscribe', { name: pkg.name })}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ/Info adicional */}
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-bold text-lg mb-4">{t('faq.title')}</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-white font-medium mb-1">{t('faq.q1')}</p>
              <p className="text-zinc-400">{t('faq.a1')}</p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">{t('faq.q2')}</p>
              <p className="text-zinc-400">{t('faq.a2')}</p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">{t('faq.q3')}</p>
              <p className="text-zinc-400">{t('faq.a3')}</p>
            </div>
            {selectedCycle !== 'monthly' && (
              <div>
                <p className="text-white font-medium mb-1">{t('faq.q4', { months: selectedCycle === 'quarterly' ? '3' : selectedCycle === 'semiannual' ? '6' : '12' })}</p>
                <p className="text-zinc-400">{t('faq.a4', { months: selectedCycle === 'quarterly' ? '3' : selectedCycle === 'semiannual' ? '6' : '12' })}</p>
              </div>
            )}
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
