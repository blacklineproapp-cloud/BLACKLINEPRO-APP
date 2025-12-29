import { SkeletonProjectList, Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>

        {/* Projects grid skeleton */}
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <SkeletonProjectList count={6} />
        </div>
      </div>
    </div>
  );
}
