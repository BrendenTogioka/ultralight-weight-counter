import { Skeleton } from '@/components/ui/Skeleton'

export default function NewTripLoading() {
  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <Skeleton className="h-4 w-24 mb-6" />
      <Skeleton className="h-7 w-28 mb-8" />

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
