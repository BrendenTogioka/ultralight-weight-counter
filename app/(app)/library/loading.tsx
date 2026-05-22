import { TableRowSkeleton } from '@/components/ui/Skeleton'

export default function LibraryLoading() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 bg-secondary rounded-lg animate-pulse" />
          <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-secondary rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-3 mb-6">
        <div className="h-10 flex-1 bg-secondary rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-secondary rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-secondary rounded-lg animate-pulse" />
        <div className="h-10 w-28 bg-secondary rounded-lg animate-pulse" />
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="h-10 bg-secondary/50 border-b border-border animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
