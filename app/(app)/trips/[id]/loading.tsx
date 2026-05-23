import { WeightBarSkeleton, ChartsSkeleton, TripItemRowSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function TripLoading() {
  return (
    <div className="px-4 sm:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 hidden sm:block" />
          <Skeleton className="h-9 w-24 hidden sm:block" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Weight summary bar */}
      <WeightBarSkeleton />

      {/* Charts */}
      <ChartsSkeleton />

      {/* Filter chips + view toggle */}
      <div className="flex items-center gap-2 mt-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
        <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
      </div>

      {/* Category groups */}
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
            {/* Item rows */}
            {Array.from({ length: 3 }).map((_, j) => (
              <TripItemRowSkeleton key={j} isLast={j === 2} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
