import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { TripCompareClient } from '@/components/trips/TripCompareClient'
import type { Trip } from '@/types'

export default async function TripComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const [{ a, b }, user, supabase] = await Promise.all([
    searchParams,
    getUser(),
    createClient(),
  ])

  // Need exactly two distinct trip IDs
  if (!a || !b || a === b) redirect('/trips')

  const [{ data: tripA }, { data: tripB }] = await Promise.all([
    supabase
      .from('trips')
      .select(`*, trip_items(*, gear_item:gear_items(*))`)
      .eq('id', a)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('trips')
      .select(`*, trip_items(*, gear_item:gear_items(*))`)
      .eq('id', b)
      .eq('user_id', user!.id)
      .single(),
  ])

  if (!tripA || !tripB) notFound()

  return <TripCompareClient tripA={tripA as Trip} tripB={tripB as Trip} />
}
