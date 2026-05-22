import { CardSkeleton } from '@/components/ui/Skeleton'

export default function TripsLoading() {
  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-16 bg-secondary rounded-lg animate-pulse" />
          <div className="h-4 w-14 bg-secondary rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-secondary rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
