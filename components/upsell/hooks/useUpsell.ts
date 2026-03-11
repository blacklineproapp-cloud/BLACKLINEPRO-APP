'use client';

import { useState, useCallback } from 'react';
import type { PlanType } from '@/lib/billing/plans';
import type { BillingCycle } from '@/lib/billing/types';

type UpsellModalType = 'none' | 'blur_preview' | 'plan_comparison' | 'checkout_upsell';

interface UpsellState {
  modalType: UpsellModalType;
  currentPlan: PlanType;
  targetPlan?: PlanType;
  featureName?: string;
  blurredImageSrc?: string;
  context?: 'checkout' | 'feature_locked' | 'limit_reached' | 'upgrade_prompt';
}

interface UseUpsellReturn {
  state: UpsellState;
  showBlurPreview: (params: { blurredImageSrc: string; currentPlan?: PlanType }) => void;
  showPlanComparison: (params: {
    currentPlan: PlanType;
    targetPlan?: PlanType;
    featureName?: string;
    context?: UpsellState['context'];
  }) => void;
  showCheckoutUpsell: (params: {
    currentPlan: PlanType;
    targetPlan: PlanType;
  }) => void;
  closeModal: () => void;
  handlePlanSelect: (plan: PlanType, cycle: BillingCycle) => void;
  isOpen: boolean;
}

const initialState: UpsellState = {
  modalType: 'none',
  currentPlan: 'free',
};

export function useUpsell(
  onCheckout?: (plan: PlanType, cycle: BillingCycle) => void
): UseUpsellReturn {
  const [state, setState] = useState<UpsellState>(initialState);

  const showBlurPreview = useCallback(
    (params: { blurredImageSrc: string; currentPlan?: PlanType }) => {
      setState({
        modalType: 'blur_preview',
        currentPlan: params.currentPlan || 'free',
        blurredImageSrc: params.blurredImageSrc,
      });
    },
    []
  );

  const showPlanComparison = useCallback(
    (params: {
      currentPlan: PlanType;
      targetPlan?: PlanType;
      featureName?: string;
      context?: UpsellState['context'];
    }) => {
      setState({
        modalType: 'plan_comparison',
        currentPlan: params.currentPlan,
        targetPlan: params.targetPlan,
        featureName: params.featureName,
        context: params.context || 'upgrade_prompt',
      });
    },
    []
  );

  const showCheckoutUpsell = useCallback(
    (params: { currentPlan: PlanType; targetPlan: PlanType }) => {
      setState({
        modalType: 'checkout_upsell',
        currentPlan: params.currentPlan,
        targetPlan: params.targetPlan,
        context: 'checkout',
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setState(initialState);
  }, []);

  const handlePlanSelect = useCallback(
    (plan: PlanType, cycle: BillingCycle) => {
      closeModal();
      onCheckout?.(plan, cycle);
    },
    [closeModal, onCheckout]
  );

  return {
    state,
    showBlurPreview,
    showPlanComparison,
    showCheckoutUpsell,
    closeModal,
    handlePlanSelect,
    isOpen: state.modalType !== 'none',
  };
}

/**
 * Determines if upsell should be shown when user clicks checkout
 */
export function shouldShowCheckoutUpsell(
  currentPlan: PlanType,
  targetPlan: PlanType
): boolean {
  // Show upsell if user is on free/ink trying to get ink
  // Suggest they consider Pro instead
  const upsellablePlans: PlanType[] = ['free', 'ink'];
  const suggestHigherFor: PlanType[] = ['ink'];

  return (
    upsellablePlans.includes(currentPlan) &&
    suggestHigherFor.includes(targetPlan)
  );
}

/**
 * Gets the recommended upsell plan based on current selection
 */
export function getRecommendedUpsell(targetPlan: PlanType): PlanType | null {
  const recommendations: Partial<Record<PlanType, PlanType>> = {
    ink: 'pro',
    pro: 'studio',
  };

  return recommendations[targetPlan] || null;
}

/**
 * Calculates potential savings when upgrading to recommended plan
 */
export function calculateUpsellValue(
  targetPlan: PlanType,
  recommendedPlan: PlanType,
  cycle: BillingCycle = 'monthly'
): { priceDiff: number; extraFeatures: string[] } {
  const extraFeatures: Record<string, string[]> = {
    'ink_to_pro': [
      '115 gerações extras/mês',
      'IA Generativa',
      'Color Match',
      'Enhance 4K',
    ],
    'pro_to_studio': [
      '470 gerações extras/mês',
      'Suporte prioritário',
      'Ideal para estúdios',
    ],
  };

  const key = `${targetPlan}_to_${recommendedPlan}`;

  // Price differences (monthly)
  const priceDiffs: Record<string, number> = {
    'ink_to_pro': 40, // R$69 - R$29
    'pro_to_studio': 130, // R$199 - R$69
  };

  return {
    priceDiff: priceDiffs[key] || 0,
    extraFeatures: extraFeatures[key] || [],
  };
}
