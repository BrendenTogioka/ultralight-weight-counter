import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return <SettingsClient settings={settings} user={user!} />
}
