'use client';

import { Key, Clipboard, Upload, Download, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

const stepIcons = [Key, Clipboard, Upload, Download];

const tagColors = [
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
];

export default function HowItWorks() {
  const t = useTranslations('landing.howItWorks');

  const steps = [
    {
      number: 1,
      icon: stepIcons[0],
      title: t('step1.title'),
      description: t('step1.description'),
      highlight: t('step1.highlight'),
      highlightHref: 'https://aistudio.google.com/apikey',
      tag: t('step1.tag'),
      tagColor: tagColors[0],
    },
    {
      number: 2,
      icon: stepIcons[1],
      title: t('step2.title'),
      description: t('step2.description'),
      highlight: t('step2.highlight'),
      tag: t('step2.tag'),
      tagColor: tagColors[1],
    },
    {
      number: 3,
      icon: stepIcons[2],
      title: t('step3.title'),
      description: t('step3.description'),
      highlight: t('step3.highlight'),
      tag: t('step3.tag'),
      tagColor: tagColors[2],
    },
    {
      number: 4,
      icon: stepIcons[3],
      title: t('step4.title'),
      description: t('step4.description'),
      highlight: t('step4.highlight'),
      tag: t('step4.tag'),
      tagColor: tagColors[3],
    },
  ];

  return (
    <section className="py-20 bg-black border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <Key size={12} /> {t('badge')}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3"
              >
                {/* Icon + tag row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="relative w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                    <Icon className="text-indigo-400" size={24} />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-black text-white">
                      {step.number}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${step.tagColor}`}>
                    {step.tag}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white leading-tight">
                  {step.title}
                </h3>

                <p className="text-zinc-400 text-xs leading-relaxed flex-grow">
                  {step.description}
                </p>

                {step.highlightHref ? (
                  <a
                    href={step.highlightHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink size={11} />
                    {step.highlight}
                  </a>
                ) : (
                  <span className="text-zinc-400 text-[11px] font-medium">{step.highlight}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <p className="text-white font-semibold text-sm">{t('cta.noKey')}</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              {t('cta.noKeyDesc')}
            </p>
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
          >
            <Key size={14} />
            {t('cta.createKey')}
            <ExternalLink size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
