import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import type { Trip, GearType } from '@/types'

export default async function DashboardPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const [{ data: trips }, { data: gearTypes }] = await Promise.all([
    supabase
      .from('trips')
      .select(`
        *,
        trip_items (
          id, included, wear_type, quantity, override_weight_oz,
          gear_item:gear_items ( weight_oz, weight_unit )
        )
      `)
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('gear_types')
      .select('*')
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order('name'),
  ])

  return (
    <DashboardClient
      trips={(trips ?? []) as Trip[]}
      userId={user!.id}
      gearTypes={(gearTypes ?? []) as GearType[]}
    />
  )
}
