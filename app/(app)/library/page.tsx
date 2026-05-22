import { createClient } from '@/lib/supabase/server'
import { GearLibraryClient } from '@/components/gear/GearLibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: gearItems }, { data: gearTypes }, { data: settings }] = await Promise.all([
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
      .from('user_settings')
      .select('default_unit')
      .eq('user_id', user!.id)
      .single(),
  ])

  return (
    <GearLibraryClient
      initialItems={gearItems ?? []}
      gearTypes={gearTypes ?? []}
      userId={user!.id}
    />
  )
}
