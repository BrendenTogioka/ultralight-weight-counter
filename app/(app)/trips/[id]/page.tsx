import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TripDetailClient } from '@/components/trips/TripDetailClient'

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: trip }, { data: gearTypes }] = await Promise.all([
    supabase
      .from('trips')
      .select(`
        *,
        trip_items (
          *,
          gear_item:gear_items (*)
        )
      `)
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('gear_types')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .order('name'),
  ])

  if (!trip) notFound()

  return (
    <TripDetailClient
      trip={trip}
      gearTypes={gearTypes ?? []}
      userId={user!.id}
    />
  )
}
