'use client';

import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; label?: string }; // positive = up, negative = down
  subtitle?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon, trend, subtitle, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const trendPositive = trend && trend.value >= 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trendPositive ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {trendPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend.value).toFixed(1)}%
            {trend.label && <span className="text-zinc-500 ml-1">{trend.label}</span>}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-500">{title}</div>
      {subtitle && <div className="text-xs text-zinc-600 mt-0.5">{subtitle}</div>}
    </div>
  );
}
