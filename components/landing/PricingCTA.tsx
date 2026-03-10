'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/lib/navigation';
import { Key, Cloud, Crown, Sparkles, Check, X } from 'lucide-react';
import { PLAN_PRICING } from '@/lib/billing/plans';
import { Button } from '@/components/ui/button';

export default function PricingCTA() {
  const t = useTranslations('landing.pricing');
  const router = useRouter();

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'Grátis',
      storageLabel: 'Somente local',
      icon: Key,
      iconBg: 'bg-zinc-800 border-zinc-700',
      iconColor: 'text-zinc-400',
      gradient: 'from-zinc-900 to-zinc-950',
      border: 'border-zinc-700',
      features: t.raw('features.free') as string[],
      cta: t('cta.free'),
      ctaClass: 'bg-zinc-700 hover:bg-zinc-600 text-white',
      action: () => router.push('/editor'),
    },
    {
      id: 'ink',
      name: 'Blackline Ink',
      price: `R$ ${PLAN_PRICING.ink.monthly.toFixed(0)}`,
      storageLabel: '5 GB nuvem',
      icon: Cloud,
      iconBg: 'bg-indigo-900/20 border-indigo-500/30',
      iconColor: 'text-indigo-400',
      gradient: 'from-indigo-900/10 to-zinc-950',
      border: 'border-zinc-700',
      features: t.raw('features.ink') as string[],
      cta: t('cta.ink'),
      ctaClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      action: () => router.push('/pricing'),
    },
    {
      id: 'pro',
      name: 'Pro',
      price: `R$ ${PLAN_PRICING.pro.monthly.toFixed(0)}`,
      storageLabel: '10 GB nuvem',
      icon: Crown,
      iconBg: 'bg-indigo-900/30 border-indigo-500/40',
      iconColor: 'text-indigo-400',
      gradient: 'from-indigo-900/20 to-zinc-950',
      border: 'border-indigo-500/60',
      popular: true,
      features: t.raw('features.pro') as string[],
      cta: t('cta.pro'),
      ctaClass: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white',
      action: () => router.push('/pricing'),
    },
    {
      id: 'studio',
      name: 'Studio',
      price: `R$ ${PLAN_PRICING.studio.monthly.toFixed(0)}`,
      storageLabel: '25 GB nuvem',
      icon: Sparkles,
      iconBg: 'bg-zinc-800 border-zinc-700',
      iconColor: 'text-indigo-400',
      gradient: 'from-indigo-900/10 to-zinc-950',
      border: 'border-zinc-700',
      features: t.raw('features.studio') as string[],
      cta: t('cta.studio'),
      ctaClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      action: () => router.push('/pricing'),
    },
  ];

  return (
    <section className="py-20 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <Key size={12} /> {t('badge')}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`bg-gradient-to-br ${plan.gradient} border-2 ${plan.border} rounded-2xl p-6 relative flex flex-col ${
                  plan.popular ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                    {t('mostPopular')}
                  </div>
                )}

                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${plan.iconBg}`}>
                  <Icon className={plan.iconColor} size={20} />
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    {plan.id !== 'free' && <span className="text-zinc-500 text-xs">/mês</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 px-2 py-1 rounded-md">
                    <Cloud size={9} /> {plan.storageLabel}
                  </span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-grow">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={plan.action}
                  variant={plan.id === 'free' ? 'secondary' : plan.id === 'pro' ? 'gradient' : 'default'}
                  className="w-full py-2.5 rounded-xl shadow-md"
                >
                  {plan.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors text-sm"
          >
            {t('viewAll')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
