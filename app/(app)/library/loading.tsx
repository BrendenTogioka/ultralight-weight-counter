import { TableRowSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function LibraryLoading() {
  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Skeleton className="h-10 flex-1 min-w-48" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-18 ml-auto" />
      </div>

      {/* List */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Column header */}
        <div className="h-10 bg-secondary/50 border-b border-border animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
