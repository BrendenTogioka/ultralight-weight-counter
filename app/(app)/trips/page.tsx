import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { TripCard } from '@/components/trips/TripCard'
import type { Trip } from '@/types'

export default async function TripsPage() {
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
    .eq('is_template', false)
    .order('updated_at', { ascending: false })

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {trips?.length ?? 0} trip{trips?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New trip
        </Link>
      </div>

      {!trips || trips.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <p className="font-medium text-foreground mb-1">No trips yet</p>
          <p className="text-sm text-muted-foreground mb-5">
            Create your first trip to start tracking pack weight.
          </p>
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create a trip
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip: Trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
