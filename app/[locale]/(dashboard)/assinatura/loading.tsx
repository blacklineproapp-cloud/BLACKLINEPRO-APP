import { Skeleton } from '@/components/ui/Skeleton';

export default function AssinaturaLoading() {
  return (
    <div className="min-h-screen bg-black p-4 lg:p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Back button + Header */}
      <div className="mb-8">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Plan Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Features list */}
        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <Skeleton className="h-4 w-32 mb-3" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>

      {/* API Key + Storage cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <Skeleton className="h-5 w-36 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <Skeleton className="h-5 w-44 mb-3" />
          <Skeleton className="h-2 w-full rounded-full mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Payment info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <Skeleton className="h-5 w-40 mb-3" />
        <Skeleton className="h-4 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
