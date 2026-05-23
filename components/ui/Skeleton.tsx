import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-secondary', className)} />
  )
}

/** Trip card — 16:9 image hero on top, content below */
export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      {/* 16:9 image placeholder */}
      <Skeleton className="aspect-video w-full rounded-none" />
      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="mt-auto pt-1">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

/** Gear library list row — icon + name + brand + category + weight (no actions) */
export function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-center px-4 py-3 border-b border-border">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="hidden sm:block h-3 w-24 text-right" />
      <Skeleton className="hidden sm:block h-3 w-24 text-right" />
      <Skeleton className="h-3 w-16 text-right" />
    </div>
  )
}

/** Weight summary bar on trip detail page */
export function WeightBarSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="grid grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
    </div>
  )
}

/** Placeholder for the charts section (2 side-by-side on desktop) */
export function ChartsSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0, 1].map(i => (
        <div key={i} className="bg-card border border-border rounded-2xl p-5">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

/** Single trip item row in the list */
export function TripItemRowSkeleton({ isLast }: { isLast?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-3', !isLast && 'border-b border-border')}>
      <Skeleton className="w-4 h-4 rounded shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-14 text-right" />
    </div>
  )
}
