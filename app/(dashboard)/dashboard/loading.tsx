import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Contador de Uso Skeleton */}
      <div className="mb-6 lg:mb-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 lg:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" />
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-3 w-10 mb-1" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6 lg:mb-10">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Workflow Section Skeleton */}
      <div className="mb-8 lg:mb-12">
        <Skeleton className="h-4 w-36 mb-4 lg:mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 lg:p-6 rounded-xl">
              <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg mb-3 lg:mb-4" />
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Galeria Skeleton */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg">
              <div className="aspect-square bg-zinc-100 relative">
                <Skeleton className="absolute inset-0" />
              </div>
              <div className="bg-zinc-900 p-2 lg:p-3 border-t border-zinc-800">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
