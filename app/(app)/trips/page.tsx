import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { TripsClient } from '@/components/trips/TripsClient'
import type { Trip } from '@/types'

export default async function TripsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

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

  return <TripsClient trips={(trips ?? []) as Trip[]} />
}
