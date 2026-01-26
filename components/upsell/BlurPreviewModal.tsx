'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, Lock, Unlock, Eye, EyeOff, Check, Zap, TrendingUp } from 'lucide-react';
import { PLANS, formatPrice, getMonthlyEquivalent, PLAN_PRICING, type PlanType } from '@/lib/billing/plans';
import { PLAN_LIMITS } from '@/lib/billing/limits';
import type { BillingCycle } from '@/lib/stripe/types';
import UpgradeBadge from './UpgradeBadge';

interface BlurPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blurredImageSrc: string;
  onSubscribe: (plan: PlanType, cycle: BillingCycle) => void;
}

// Features destacadas para cada plano (Free → Starter/Pro)
const STARTER_FEATURES = [
  { label: 'Editor de Stencil', description: 'Crie stencils profissionais' },
  { label: 'Modo Topográfico', description: 'Máximo detalhe nas linhas' },
  { label: 'Ferramentas Básicas', description: 'Remove fundo, enhance' },
  { label: '95 gerações/mês', description: 'Limite mensal' },
];

const PRO_FEATURES = [
  { label: 'Tudo do Starter', description: 'Todas as features' },
  { label: 'IA Generativa', description: 'Crie designs do zero', isNew: true },
  { label: 'Color Match IA', description: 'Paleta inteligente', isNew: true },
  { label: 'Enhance 4K', description: 'Qualidade máxima', isNew: true },
  { label: 'Dividir A4', description: 'Impressão otimizada', isNew: true },
  { label: '210 gerações/mês', description: '+115 gerações', isNew: true },
];

export default function BlurPreviewModal({
  isOpen,
  onClose,
  blurredImageSrc,
  onSubscribe,
}: BlurPreviewModalProps) {
  const [showComparison, setShowComparison] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowComparison(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const starterPrice = getMonthlyEquivalent('starter', 'monthly');
  const proPrice = getMonthlyEquivalent('pro', 'monthly');
  const starterYearlyPrice = getMonthlyEquivalent('starter', 'yearly');
  const proYearlyPrice = getMonthlyEquivalent('pro', 'yearly');

  const starterYearlySavings = Math.round((1 - starterYearlyPrice / starterPrice) * 100);
  const proYearlySavings = Math.round((1 - proYearlyPrice / proPrice) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-700 overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
        >
          <X size={18} className="text-zinc-400" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center bg-gradient-to-b from-blue-500/10 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Sparkles size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            Gostou do resultado?
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Assine para desbloquear a versão em alta qualidade!
          </p>
        </div>

        {/* Image Preview */}
        <div className="px-6">
          <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
            {/* Toggle button */}
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              {showComparison ? (
                <>
                  <EyeOff size={12} />
                  Preview
                </>
              ) : (
                <>
                  <Eye size={12} />
                  Ver HD
                </>
              )}
            </button>

            {/* Blur indicator */}
            <div className="absolute top-3 left-3 z-10">
              {showComparison ? (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                  <Unlock size={12} />
                  HD Desbloqueado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">
                  <Lock size={12} />
                  Preview (Baixa Qualidade)
                </span>
              )}
            </div>

            {/* Image */}
            <div className="relative aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blurredImageSrc}
                alt="Preview"
                className={`w-full h-full object-contain transition-all duration-500 ${
                  showComparison ? '' : 'blur-sm brightness-90'
                }`}
              />

              {/* HD overlay hint */}
              {!showComparison && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="text-center">
                    <Lock size={32} className="mx-auto text-white/60 mb-2" />
                    <p className="text-white/80 text-sm font-medium">
                      Clique em "Ver HD" para visualizar
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plans - Side by Side */}
        <div className="p-6">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4 text-center">
            Escolha seu plano
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Starter */}
            <div className="relative flex flex-col rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 transition-all">
              <div className="p-4">
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-zinc-400">Ideal para começar</p>

                <div className="mt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{formatPrice(starterPrice)}</span>
                    <span className="text-sm text-zinc-400">/mês</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">
                      Economize {starterYearlySavings}% no anual ({formatPrice(starterYearlyPrice)}/mês)
                    </span>
                  </div>
                </div>

                {/* Generations highlight */}
                <div className="mt-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-700">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-white">95 gerações/mês</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 px-4 pb-4">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Inclui:</p>
                <div className="space-y-1.5">
                  {STARTER_FEATURES.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check size={14} className="text-zinc-500 flex-shrink-0" />
                      <span>{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => onSubscribe('starter', 'monthly')}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                >
                  Assinar Starter
                </button>
              </div>
            </div>

            {/* Pro - Highlighted */}
            <div className="relative flex flex-col rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent hover:border-amber-500 transition-all">
              {/* Popular Badge */}
              <div className="absolute -top-px left-1/2 -translate-x-1/2">
                <UpgradeBadge variant="popular" className="rounded-t-none" />
              </div>

              <div className="p-4 pt-7">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Pro</h3>
                  <Sparkles size={16} className="text-amber-400" />
                </div>
                <p className="text-xs text-zinc-400">Para tatuadores profissionais</p>

                <div className="mt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{formatPrice(proPrice)}</span>
                    <span className="text-sm text-zinc-400">/mês</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">
                      Economize {proYearlySavings}% no anual ({formatPrice(proYearlyPrice)}/mês)
                    </span>
                  </div>
                </div>

                {/* Generations highlight */}
                <div className="mt-3 p-2 rounded-lg bg-zinc-900/50 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-sm font-medium text-white">210 gerações/mês</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 px-4 pb-4">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">O que você ganha:</p>
                <div className="space-y-1.5">
                  {PRO_FEATURES.map((feature, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-sm ${feature.isNew ? 'text-emerald-400' : 'text-zinc-300'}`}
                    >
                      <Check size={14} className={`flex-shrink-0 ${feature.isNew ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span className="font-medium">{feature.label}</span>
                      {feature.isNew && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                          NOVO
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() => onSubscribe('pro', 'monthly')}
                  className="w-full py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-black transition-colors"
                >
                  Assinar Pro
                </button>
              </div>
            </div>
          </div>

          {/* Annual savings highlight */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-center gap-2 text-sm">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-zinc-300">
                <span className="text-emerald-400 font-semibold">Economize até 40%</span> escolhendo o plano anual no checkout!
              </span>
            </div>
          </div>

          {/* Link to all plans */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1"
          >
            Ver todos os planos
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
