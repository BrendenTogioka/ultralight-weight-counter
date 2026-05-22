import { createClient } from '@/lib/supabase/server'
import { NewTripClient } from '@/components/trips/NewTripClient'

export default async function NewTripPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, is_template, trip_date')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  return <NewTripClient existingTrips={trips ?? []} userId={user!.id} />
}
