import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
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

  return <DashboardClient trips={(trips ?? []) as Trip[]} />
}
