import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { NewTripClient } from '@/components/trips/NewTripClient'

export default async function NewTripPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, is_template, trip_date')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  return <NewTripClient existingTrips={trips ?? []} userId={user!.id} />
}
