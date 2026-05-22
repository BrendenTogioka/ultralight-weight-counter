import { Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <Skeleton className="h-7 w-24 mb-8" />

      {[1, 2, 3].map(i => (
        <section key={i} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </section>
      ))}
    </div>
  )
}
