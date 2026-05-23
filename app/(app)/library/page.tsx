import { createClient } from '@/lib/supabase/server'
import { GearLibraryClient } from '@/components/gear/GearLibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    supabase
      .from('kits')
      .select('*, kit_items(*, gear_item:gear_items(*))')
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
