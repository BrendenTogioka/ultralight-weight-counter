import { CardSkeleton, ChartsSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Analytics charts placeholder */}
      <ChartsSkeleton />

      {/* Recent trips section */}
      <div className="mt-8 md:mt-10">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
