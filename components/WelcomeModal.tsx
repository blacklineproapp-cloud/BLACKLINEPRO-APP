'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { X, Sparkles, Shield, Cloud, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'blp-welcome-seen';

interface WelcomeModalProps {
  /** Show modal — parent decides based on user plan */
  show: boolean;
}

export default function WelcomeModal({ show }: WelcomeModalProps) {
  const t = useTranslations('welcome');
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  useEffect(() => {
    if (!show) return;
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (seen) return;
      // Delay para o editor renderizar primeiro
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    } catch {
      // sessionStorage unavailable
    }
  }, [show]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    }, 400);
  }, []);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    // Step 0: Hero — app is FREE
    <div key="hero" className="flex flex-col items-center text-center px-2">
      {/* Logo with lightning effect */}
      <div
        className="relative mb-6 cursor-pointer select-none"
        onMouseEnter={() => setLogoHovered(true)}
        onMouseLeave={() => setLogoHovered(false)}
        onTouchStart={() => setLogoHovered(true)}
        onTouchEnd={() => setTimeout(() => setLogoHovered(false), 1200)}
      >
        {/* Lightning bolts — appear on hover */}
        <svg className={`absolute -inset-6 w-[calc(100%+48px)] h-[calc(100%+48px)] pointer-events-none transition-opacity duration-300 ${logoHovered ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 120 120" fill="none" aria-hidden="true">
          {/* Top-right bolt */}
          <path d="M85 10 L78 35 L88 33 L72 58" stroke="url(#bolt1)" strokeWidth="2" strokeLinecap="round" className="animate-[lightning_0.8s_ease-out_forwards]" />
          {/* Bottom-left bolt */}
          <path d="M35 110 L42 85 L32 87 L48 62" stroke="url(#bolt2)" strokeWidth="2" strokeLinecap="round" className="animate-[lightning_0.8s_ease-out_0.15s_forwards]" />
          {/* Left small bolt */}
          <path d="M8 50 L22 48 L18 55 L30 45" stroke="url(#bolt3)" strokeWidth="1.5" strokeLinecap="round" className="animate-[lightning_0.6s_ease-out_0.3s_forwards]" />
          {/* Right small bolt */}
          <path d="M112 70 L98 72 L102 65 L90 75" stroke="url(#bolt3)" strokeWidth="1.5" strokeLinecap="round" className="animate-[lightning_0.6s_ease-out_0.1s_forwards]" />
          <defs>
            <linearGradient id="bolt1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="bolt2" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="bolt3" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Glow behind logo */}
        <div className={`absolute inset-0 transition-all duration-500 ${
          logoHovered
            ? 'shadow-[0_0_50px_rgba(99,102,241,0.5),0_0_100px_rgba(99,102,241,0.2)]'
            : 'shadow-[0_0_20px_rgba(99,102,241,0.15)]'
        } rounded-full`} />

        {/* Logo — transparent B */}
        <div className={`relative w-24 h-24 transition-all duration-500 ${
          logoHovered ? 'scale-110 drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'scale-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]'
        }`}>
          <Image
            src="/icon-192x192.png"
            alt="Black Line Pro"
            width={96}
            height={96}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>

      <h2 id="modal-title" className="text-2xl lg:text-3xl font-bold text-white mb-2">
        {t('title')}
      </h2>
      <p className="text-indigo-400 font-semibold text-lg mb-4">
        {t('subtitle')}
      </p>
      <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
        {t('description')}
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {[
          { icon: Zap, label: t('pill.unlimited') },
          { icon: Sparkles, label: t('pill.ai') },
          { icon: Shield, label: t('pill.free') },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </span>
        ))}
      </div>
    </div>,

    // Step 1: How it works (BYOK)
    <div key="byok" className="px-2">
      <h3 className="text-xl font-bold text-white text-center mb-6">
        {t('howItWorks.title')}
      </h3>

      <div className="space-y-4">
        {[
          {
            step: '1',
            title: t('howItWorks.step1.title'),
            desc: t('howItWorks.step1.desc'),
          },
          {
            step: '2',
            title: t('howItWorks.step2.title'),
            desc: t('howItWorks.step2.desc'),
          },
          {
            step: '3',
            title: t('howItWorks.step3.title'),
            desc: t('howItWorks.step3.desc'),
          },
        ].map((item) => (
          <div key={item.step} className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold text-sm">
              {item.step}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{item.title}</p>
              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Link to AI Studio */}
      <div className="mt-6 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
        <p className="text-zinc-400 text-xs text-center">
          {t('howItWorks.aiStudioHint')}{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
          >
            aistudio.google.com
          </a>
        </p>
      </div>
    </div>,

    // Step 2: Plans
    <div key="plans" className="px-2">
      <h3 className="text-xl font-bold text-white text-center mb-2">
        {t('plans.title')}
      </h3>
      <p className="text-zinc-400 text-xs text-center mb-6">
        {t('plans.subtitle')}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Free */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4 flex flex-col">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('plans.free.name')}</span>
          <span className="text-2xl font-bold text-white mt-1">R$ 0</span>
          <ul className="mt-3 space-y-1.5 text-xs text-zinc-400 flex-1">
            <li className="flex items-start gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
              {t('plans.free.feat1')}
            </li>
            <li className="flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
              {t('plans.free.feat2')}
            </li>
            <li className="flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
              {t('plans.free.feat3')}
            </li>
          </ul>
        </div>

        {/* Paid */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex flex-col relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider relative">{t('plans.paid.name')}</span>
          <span className="text-2xl font-bold text-white mt-1 relative">{t('plans.paid.price')}</span>
          <ul className="mt-3 space-y-1.5 text-xs text-zinc-300 flex-1 relative">
            <li className="flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
              {t('plans.paid.feat1')}
            </li>
            <li className="flex items-start gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
              {t('plans.paid.feat2')}
            </li>
            <li className="flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
              {t('plans.paid.feat3')}
            </li>
          </ul>
        </div>
      </div>
    </div>,
  ];

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-400 ${
        isExiting ? 'bg-black/0 backdrop-blur-none' : 'bg-black/70 backdrop-blur-md'
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Ambient indigo particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-purple-600/6 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-indigo-400/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '-1.5s' }} />
      </div>

      {/* Modal card */}
      <div
        className={`relative w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-modal overflow-hidden transition-all duration-400 ${
          isExiting
            ? 'opacity-0 scale-95 translate-y-4'
            : 'opacity-100 scale-100 translate-y-0 animate-zoom-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content area */}
        <div className="px-6 pt-8 pb-6">
          {/* Step content with transition */}
          <div className="min-h-[320px] flex items-center justify-center">
            <div key={step} className="w-full animate-fade-in">
              {steps[step]}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {/* Step indicators */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-6 bg-indigo-500'
                      : 'w-1.5 bg-zinc-700 hover:bg-zinc-600'
                  }`}
                  aria-label={`Passo ${i + 1}`}
                />
              ))}
            </div>

            {/* Action button */}
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="gap-1.5"
                size="sm"
              >
                {t('next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleClose}
                variant="gradient"
                size="sm"
                className="gap-1.5"
              >
                {t('start')}
                <Zap className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
