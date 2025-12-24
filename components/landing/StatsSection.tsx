'use client';

import { useEffect, useState } from 'react';
import { Users, Image, TrendingUp } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  totalProjects: number;
  paidUsers: number;
  conversionRate: number;
}

function AnimatedCounter({ end }: { end: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
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
              <Image className="text-purple-500" size={32} />
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
