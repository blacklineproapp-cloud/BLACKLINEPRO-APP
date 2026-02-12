'use client';

import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function ChartCard({ title, children, actions, loading, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
