import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { GearLibraryClient } from '@/components/gear/GearLibraryClient'

export default async function LibraryPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const [{ data: gearItems }, { data: gearTypes }, { data: kits }] = await Promise.all([
    supabase
      .from('gear_items')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('gear_types')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .order('name'),
    // Only select columns shown in the kit card — name, weight, quantity
    supabase
      .from('kits')
      .select('*, kit_items(id, quantity, sort_order, gear_item:gear_items(id, name, weight_oz, weight_unit))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <GearLibraryClient
      initialItems={gearItems ?? []}
      initialKits={kits ?? []}
      gearTypes={gearTypes ?? []}
      userId={user!.id}
    />
  )
}
