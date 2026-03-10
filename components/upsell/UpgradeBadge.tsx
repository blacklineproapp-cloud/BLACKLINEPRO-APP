'use client';

import { Star, Flame, Zap, Trophy, Sparkles } from 'lucide-react';

type BadgeVariant = 'popular' | 'savings' | 'recommended' | 'best' | 'new';

interface UpgradeBadgeProps {
  variant: BadgeVariant;
  text?: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, {
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
}> = {
  popular: {
    bg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: <Star size={10} className="fill-current" />,
  },
  savings: {
    bg: 'bg-gradient-to-r from-indigo-500/20 to-green-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    icon: <Zap size={10} />,
  },
  recommended: {
    bg: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: <Sparkles size={10} />,
  },
  best: {
    bg: 'bg-gradient-to-r from-indigo-500/20 to-pink-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    icon: <Trophy size={10} />,
  },
  new: {
    bg: 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    icon: <Flame size={10} />,
  },
};

const defaultTexts: Record<BadgeVariant, string> = {
  popular: 'Mais Popular',
  savings: 'Economize',
  recommended: 'Recomendado',
  best: 'Melhor Oferta',
  new: 'Novo',
};

export default function UpgradeBadge({
  variant,
  text,
  className = '',
}: UpgradeBadgeProps) {
  const style = variantStyles[variant];
  const displayText = text || defaultTexts[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5
        text-[10px] font-bold uppercase tracking-wider
        rounded-full border
        ${style.bg} ${style.text} ${style.border}
        ${className}
      `}
    >
      {style.icon}
      {displayText}
    </span>
  );
}
