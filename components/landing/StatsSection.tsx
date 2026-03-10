'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Image as ImageIcon, TrendingUp } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  totalProjects: number;
  paidUsers: number;
  conversionRate: number;
}

function AnimatedCounter({ end }: { end: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    const duration = 2000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(easedProgress * end);
      setCount(currentCount);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => { if (animationFrame) cancelAnimationFrame(animationFrame); };
  }, [end]);

  return <span>{count.toLocaleString('pt-BR')}</span>;
}

export default function StatsSection({ stats }: { stats: StatsData }) {
  const t = useTranslations('landing.stats');

  const items = [
    {
      icon: Users,
      value: <><AnimatedCounter end={stats.totalUsers} />+</>,
      label: t('users'),
    },
    {
      icon: ImageIcon,
      value: <><AnimatedCounter end={stats.totalProjects} />+</>,
      label: t('projects'),
    },
    {
      icon: TrendingUp,
      value: <><AnimatedCounter end={98} />%</>,
      label: t('satisfaction'),
    },
  ];

  return (
    <section className="py-20 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, value, label }, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-indigo-900/15 to-zinc-950 border border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-8 text-center transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <Icon className="text-indigo-400" size={24} />
              </div>
              <div className="text-5xl font-bold text-white mb-2">{value}</div>
              <p className="text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
