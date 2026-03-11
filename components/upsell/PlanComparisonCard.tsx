'use client';

import { Check, X, Sparkles, Zap, TrendingUp } from 'lucide-react';
import {
  PLANS,
  PLAN_PRICING,
  formatPrice,
  getMonthlyEquivalent,
  type PlanType,
} from '@/lib/billing/plans';
import { PLAN_LIMITS } from '@/lib/billing/limits';
import type { BillingCycle } from '@/lib/billing/types';
import UpgradeBadge from './UpgradeBadge';

interface PlanComparisonCardProps {
  plan: PlanType;
  currentPlan?: PlanType;
  cycle?: BillingCycle;
  isSelected?: boolean;
  onSelect?: () => void;
  highlighted?: boolean;
  className?: string;
}

// Features com descrição detalhada do que cada upgrade oferece
const UPGRADE_FEATURES: Record<PlanType, { key: string; label: string; description: string; isNew?: boolean }[]> = {
  free: [],
  ink: [
    { key: 'byok', label: 'Gerações ilimitadas (BYOK)', description: 'Use sua chave Gemini gratuita' },
    { key: 'cloud', label: '5 GB armazenamento nuvem', description: 'Acesse de qualquer dispositivo' },
    { key: 'noAds', label: 'Sem anúncios', description: 'Experiência limpa e profissional' },
    { key: 'editor', label: 'Editor completo + modos avançados', description: 'Topográfico, Linhas Perfeitas, Anime' },
  ],
  pro: [
    { key: 'allInk', label: 'Tudo do Ink', description: 'Todas as features anteriores' },
    { key: 'cloud', label: '10 GB armazenamento nuvem', description: 'Galeria profissional completa', isNew: true },
    { key: 'ai', label: 'Generator de artes com IA', description: 'Crie designs do zero', isNew: true },
    { key: 'colorMatch', label: 'Color Match IA', description: 'Paleta inteligente', isNew: true },
    { key: 'enhance4K', label: 'Enhance 4K', description: 'Qualidade máxima', isNew: true },
    { key: 'splitA4', label: 'Dividir A4', description: 'Impressão otimizada', isNew: true },
  ],
  studio: [
    { key: 'allPro', label: 'Tudo do Pro', description: 'Todas as features anteriores' },
    { key: 'cloud', label: '25 GB armazenamento nuvem', description: 'Para toda a equipe', isNew: true },
    { key: 'multiUser', label: 'Múltiplos usuários (team)', description: 'Compartilhe com a equipe', isNew: true },
    { key: 'priority', label: 'Suporte Prioritário', description: 'Atendimento preferencial', isNew: true },
    { key: 'reports', label: 'Relatórios de Uso', description: 'Acompanhe consumo da equipe', isNew: true },
  ],
};

// O que cada upgrade oferece em relação ao plano anterior
const UPGRADE_HIGHLIGHTS: Record<PlanType, string[]> = {
  free: [],
  ink: ['Gerações ilimitadas', '5 GB nuvem', 'Sem anúncios'],
  pro: ['10 GB nuvem', 'IA Generativa', 'Color Match', 'Enhance 4K', 'Dividir A4'],
  studio: ['25 GB nuvem', 'Multi-usuário', 'Suporte prioritário'],
};

export default function PlanComparisonCard({
  plan,
  currentPlan = 'free',
  cycle = 'monthly',
  isSelected = false,
  onSelect,
  highlighted = false,
  className = '',
}: PlanComparisonCardProps) {
  const planInfo = PLANS[plan];
  const limits = PLAN_LIMITS[plan];
  const monthlyPrice = getMonthlyEquivalent(plan, cycle);
  const isPopular = planInfo.popular;
  const features = UPGRADE_FEATURES[plan];
  const highlights = UPGRADE_HIGHLIGHTS[plan];

  // Calcular economia
  const yearlySavings = plan !== 'free'
    ? Math.round((1 - getMonthlyEquivalent(plan, 'yearly') / PLAN_PRICING[plan].monthly) * 100)
    : 0;

  return (
    <div
      onClick={onSelect}
      className={`
        relative flex flex-col rounded-2xl overflow-hidden
        border transition-all duration-300
        ${onSelect ? 'cursor-pointer' : ''}
        ${isSelected
          ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/30 scale-[1.02]'
          : highlighted || isPopular
            ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/50 hover:border-amber-500'
            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
        }
        ${className}
      `}
    >
      {/* Popular Badge */}
      {(isPopular || highlighted) && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2">
          <UpgradeBadge variant="popular" className="rounded-t-none" />
        </div>
      )}

      {/* Header */}
      <div className={`p-4 ${isPopular || highlighted ? 'pt-7' : ''}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{planInfo.name}</h3>
          {isPopular && <Sparkles size={16} className="text-amber-400" />}
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">{planInfo.description}</p>

        {/* Price */}
        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {formatPrice(monthlyPrice)}
            </span>
            <span className="text-sm text-zinc-400">/mês</span>
          </div>
          {yearlySavings > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={12} className="text-indigo-400" />
              <span className="text-xs text-indigo-400">
                Economize {yearlySavings}% no anual
              </span>
            </div>
          )}
        </div>

        {/* BYOK + Storage highlight */}
        <div className="mt-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-700">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-white">
              Gerações ilimitadas (BYOK)
            </span>
          </div>
          {planInfo.storageGB && planInfo.storageGB > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-400 ml-5">
                + {planInfo.storageGB} GB armazenamento em nuvem
              </span>
            </div>
          )}
        </div>
      </div>

      {/* What you get - Highlights */}
      <div className="flex-1 px-4 pb-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
          {currentPlan === 'free' ? 'Inclui:' : 'O que você ganha:'}
        </p>
        <div className="space-y-1.5">
          {features.map((feature) => (
            <div
              key={feature.key}
              className={`flex items-start gap-2 text-sm ${
                feature.isNew ? 'text-indigo-400' : 'text-zinc-300'
              }`}
            >
              <Check
                size={14}
                className={`flex-shrink-0 mt-0.5 ${
                  feature.isNew ? 'text-indigo-400' : 'text-zinc-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{feature.label}</span>
                {feature.isNew && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold">
                    NOVO
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      {onSelect && (
        <div className="p-4 pt-0">
          <button
            type="button"
            className={`
              w-full py-2.5 rounded-xl font-semibold text-sm
              transition-all duration-200
              ${isSelected
                ? 'bg-indigo-600 text-white'
                : isPopular || highlighted
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-white'
              }
            `}
          >
            {isSelected ? 'Selecionado' : planInfo.cta}
          </button>
        </div>
      )}
    </div>
  );
}

// Side-by-side comparison component
interface PlanComparisonProps {
  plans: PlanType[];
  currentPlan?: PlanType;
  selectedPlan: PlanType | null;
  cycle?: BillingCycle;
  onSelectPlan: (plan: PlanType) => void;
  className?: string;
}

export function PlanComparison({
  plans,
  currentPlan = 'free',
  selectedPlan,
  cycle = 'monthly',
  onSelectPlan,
  className = '',
}: PlanComparisonProps) {
  return (
    <div className={`grid gap-4 ${plans.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} ${className}`}>
      {plans.map((plan, index) => (
        <PlanComparisonCard
          key={plan}
          plan={plan}
          currentPlan={currentPlan}
          cycle={cycle}
          isSelected={selectedPlan === plan}
          onSelect={() => onSelectPlan(plan)}
          highlighted={index === 1} // Highlight the second option (usually better value)
        />
      ))}
    </div>
  );
}
