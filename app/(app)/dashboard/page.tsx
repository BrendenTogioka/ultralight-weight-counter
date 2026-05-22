import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Mountain } from 'lucide-react'
import { TripCard } from '@/components/trips/TripCard'
import type { Trip } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trips } = await supabase
    .from('trips')
    .select(`
      *,
      trip_items (
        id, included, wear_type, quantity, override_weight_oz,
        gear_item:gear_items ( weight_oz, weight_unit )
      )
    `)
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  const templates = (trips ?? []).filter((t: Trip) => t.is_template)
  const activTrips = (trips ?? []).filter((t: Trip) => !t.is_template)

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activTrips.length} trip{activTrips.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New trip
        </Link>
      </div>

      {/* Active trips */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Trips
        </h2>
        {activTrips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create your first trip to start tracking pack weight."
            href="/trips/new"
            cta="Create a trip"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activTrips.map((trip: Trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {/* Templates */}
      {templates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((trip: Trip) => (
              <TripCard key={trip.id} trip={trip} isTemplate />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyState({
  title, description, href, cta,
}: {
  title: string; description: string; href: string; cta: string
}) {
  return (
    <div className="border border-dashed border-border rounded-2xl p-12 text-center">
      <Mountain className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
      <p className="font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-5">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="h-4 w-4" />
        {cta}
      </Link>
    </div>
  )
}
