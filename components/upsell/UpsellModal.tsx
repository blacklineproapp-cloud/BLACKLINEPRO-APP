'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { PLANS, formatPrice, getMonthlyEquivalent, type PlanType } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/stripe/types';
import { PlanComparison } from './PlanComparisonCard';
import BillingCycleSelector from './BillingCycleSelector';
import UpgradeBadge from './UpgradeBadge';

type UpsellContext = 'checkout' | 'feature_locked' | 'limit_reached' | 'upgrade_prompt';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  targetPlan?: PlanType;
  context?: UpsellContext;
  onSelectPlan: (plan: PlanType, cycle: BillingCycle) => void;
  featureName?: string;
}

const contextMessages: Record<UpsellContext, { title: string; subtitle: string }> = {
  checkout: {
    title: 'Escolha seu plano',
    subtitle: 'Compare os planos e escolha o melhor para você',
  },
  feature_locked: {
    title: 'Recurso Premium',
    subtitle: 'Este recurso está disponível nos planos pagos',
  },
  limit_reached: {
    title: 'Limite atingido',
    subtitle: 'Faça upgrade para continuar usando',
  },
  upgrade_prompt: {
    title: 'Upgrade seu plano',
    subtitle: 'Desbloqueie mais recursos e gerações',
  },
};

// Suggested upgrade paths
const UPGRADE_PATHS: Record<PlanType, PlanType[]> = {
  free: ['starter', 'pro'],
  legacy: ['starter', 'pro'],
  starter: ['pro', 'studio'],
  pro: ['studio', 'enterprise'],
  studio: ['enterprise'],
  enterprise: [],
};

export default function UpsellModal({
  isOpen,
  onClose,
  currentPlan,
  targetPlan,
  context = 'upgrade_prompt',
  onSelectPlan,
  featureName,
}: UpsellModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(targetPlan || null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [showCycleSelector, setShowCycleSelector] = useState(false);

  // Get plans to compare
  const plansToShow = UPGRADE_PATHS[currentPlan];
  const messages = contextMessages[context];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(targetPlan || plansToShow[0] || null);
      setSelectedCycle('monthly');
      setShowCycleSelector(false);
    }
  }, [isOpen, targetPlan, plansToShow]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || plansToShow.length === 0) return null;

  const handleContinue = () => {
    if (selectedPlan) {
      if (showCycleSelector) {
        onSelectPlan(selectedPlan, selectedCycle);
      } else {
        setShowCycleSelector(true);
      }
    }
  };

  const handleBack = () => {
    setShowCycleSelector(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-700 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
        >
          <X size={18} className="text-zinc-400" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center bg-gradient-to-b from-purple-500/10 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mb-4">
            <Sparkles size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {showCycleSelector ? 'Escolha o período' : messages.title}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {showCycleSelector
              ? `Plano ${PLANS[selectedPlan!].name} selecionado`
              : featureName
                ? `"${featureName}" ${messages.subtitle.toLowerCase()}`
                : messages.subtitle
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          {showCycleSelector && selectedPlan ? (
            // Billing Cycle Selection
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowRight size={14} className="rotate-180" />
                Voltar para planos
              </button>

              {/* Plan Summary */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {PLANS[selectedPlan].name}
                      </span>
                      {PLANS[selectedPlan].popular && (
                        <UpgradeBadge variant="popular" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {PLANS[selectedPlan].description}
                    </p>
                  </div>
                  <button
                    onClick={handleBack}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              </div>

              {/* Cycle Selector */}
              <BillingCycleSelector
                plan={selectedPlan}
                selectedCycle={selectedCycle}
                onCycleChange={setSelectedCycle}
              />

              {/* Annual savings highlight */}
              {selectedCycle === 'yearly' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-emerald-400 font-medium">
                    Você economiza {formatPrice(
                      (PLANS[selectedPlan].price.monthly * 12) - PLANS[selectedPlan].price.yearly
                    )} por ano!
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Plan Comparison
            <PlanComparison
              plans={plansToShow}
              currentPlan={currentPlan}
              selectedPlan={selectedPlan}
              cycle={selectedCycle}
              onSelectPlan={setSelectedPlan}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedPlan}
            className={`
              w-full py-3 rounded-xl font-semibold text-sm
              transition-all duration-200 flex items-center justify-center gap-2
              ${selectedPlan
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            {showCycleSelector ? (
              <>
                Assinar {selectedPlan && PLANS[selectedPlan].name}
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                Continuar
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Current plan indicator */}
          {currentPlan !== 'free' && (
            <p className="text-xs text-zinc-500 text-center mt-3">
              Seu plano atual: <span className="text-zinc-400">{PLANS[currentPlan].name}</span>
            </p>
          )}

          {/* View all plans link */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1"
          >
            Ver todos os planos
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
