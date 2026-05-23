import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function TripsLoading() {
  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Sort chips */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
