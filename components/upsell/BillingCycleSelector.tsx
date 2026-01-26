'use client';

import { Check } from 'lucide-react';
import {
  BILLING_CYCLES,
  PLAN_PRICING,
  formatPrice,
  getMonthlyEquivalent,
  type PlanType,
} from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/stripe/types';
import UpgradeBadge from './UpgradeBadge';

interface BillingCycleSelectorProps {
  plan: PlanType;
  selectedCycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  className?: string;
  compact?: boolean;
}

const cycleOrder: BillingCycle[] = ['monthly', 'quarterly', 'semiannual', 'yearly'];

const cycleMonths: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

export default function BillingCycleSelector({
  plan,
  selectedCycle,
  onCycleChange,
  className = '',
  compact = false,
}: BillingCycleSelectorProps) {
  const pricing = PLAN_PRICING[plan];
  const baseMonthly = pricing.monthly;

  // Calculate savings for each cycle
  const getSavings = (cycle: BillingCycle): number => {
    if (cycle === 'monthly') return 0;
    const monthlyEquivalent = getMonthlyEquivalent(plan, cycle);
    const savingsPerMonth = baseMonthly - monthlyEquivalent;
    const months = cycleMonths[cycle];
    return savingsPerMonth * months;
  };

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {cycleOrder.map((cycle) => {
          const cycleInfo = BILLING_CYCLES[cycle];
          const monthlyEq = getMonthlyEquivalent(plan, cycle);
          const isSelected = selectedCycle === cycle;

          return (
            <button
              key={cycle}
              type="button"
              onClick={() => onCycleChange(cycle)}
              className={`
                flex-1 min-w-[80px] px-3 py-2 rounded-lg
                border transition-all duration-200
                ${isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }
              `}
            >
              <div className="text-[10px] font-medium">{cycleInfo.label}</div>
              <div className="text-sm font-bold">
                {formatPrice(monthlyEq)}<span className="text-[10px] font-normal">/mês</span>
              </div>
              {cycleInfo.discount > 0 && (
                <div className="text-[9px] text-emerald-400">-{cycleInfo.discount}%</div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {cycleOrder.map((cycle) => {
        const cycleInfo = BILLING_CYCLES[cycle];
        const monthlyEq = getMonthlyEquivalent(plan, cycle);
        const totalPrice = pricing[cycle];
        const savings = getSavings(cycle);
        const isSelected = selectedCycle === cycle;
        const isBestValue = cycle === 'yearly';

        return (
          <button
            key={cycle}
            type="button"
            onClick={() => onCycleChange(cycle)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              border transition-all duration-200
              text-left relative
              ${isSelected
                ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/30'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
              }
              ${isBestValue && !isSelected ? 'border-emerald-500/50' : ''}
            `}
          >
            {/* Radio indicator */}
            <div
              className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                transition-colors duration-200
                ${isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-zinc-600 bg-transparent'
                }
              `}
            >
              {isSelected && <Check size={12} className="text-white" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{cycleInfo.label}</span>
                {isBestValue && (
                  <UpgradeBadge variant="best" text="Economize 40%" />
                )}
                {cycle === 'quarterly' && (
                  <UpgradeBadge variant="savings" text="-10%" />
                )}
                {cycle === 'semiannual' && (
                  <UpgradeBadge variant="savings" text="-25%" />
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {formatPrice(monthlyEq)}/mês
                {cycleMonths[cycle] > 1 && (
                  <span className="text-zinc-500">
                    {' '}· Cobrado {formatPrice(totalPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Savings */}
            {savings > 0 && (
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-emerald-400 font-medium">
                  Economize
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  {formatPrice(savings)}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
