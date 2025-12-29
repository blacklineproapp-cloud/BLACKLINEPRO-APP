import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/50 rounded ${className}`}
      {...props}
    />
  );
}

// Skeleton específicos reutilizáveis

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg">
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full" />

      {/* Info skeleton */}
      <div className="bg-zinc-900 p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonProjectList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '80%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonButton() {
  return <Skeleton className="h-10 w-32 rounded-lg" />;
}

export function SkeletonAvatar() {
  return <Skeleton className="h-10 w-10 rounded-full" />;
}
