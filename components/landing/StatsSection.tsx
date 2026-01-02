'use client';

import { useEffect, useState } from 'react';
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
    const duration = 2000; // 2 segundos

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing suave (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(easedProgress * end);

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end); // Garantir valor final exato
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end]);

  return <span>{count.toLocaleString('pt-BR')}</span>;
}

export default function StatsSection({ stats }: { stats: StatsData }) {
  return (
    <section className="py-20 bg-zinc-950 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Usuários */}
          <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center mx-auto mb-4">
              <Users className="text-emerald-500" size={32} />
            </div>
            <div className="text-5xl font-bold text-white mb-2">
              <AnimatedCounter end={stats.totalUsers} />+
            </div>
            <p className="text-zinc-400">Usuários Cadastrados</p>
          </div>

          {/* Card 2: Projetos */}
          <div className="bg-gradient-to-br from-purple-900/20 to-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="text-purple-500" size={32} />
            </div>
            <div className="text-5xl font-bold text-white mb-2">
              <AnimatedCounter end={stats.totalProjects} />+
            </div>
            <p className="text-zinc-400">Stencils Criados</p>
          </div>

          {/* Card 3: Conversão */}
          <div className="bg-gradient-to-br from-blue-900/20 to-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="text-blue-500" size={32} />
            </div>
            <div className="text-5xl font-bold text-white mb-2">
              <AnimatedCounter end={Math.round(stats.conversionRate)} />%
            </div>
            <p className="text-zinc-400">Taxa de Satisfação</p>
          </div>
        </div>
      </div>
    </section>
  );
}
