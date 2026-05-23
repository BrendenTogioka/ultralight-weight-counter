import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { UnitProvider } from '@/components/providers/UnitProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) redirect('/login')

  // Fetch user settings (runs in parallel with page data fetches via React cache)
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <UnitProvider defaultUnit={settings?.default_unit ?? 'oz'}>
      {/* h-dvh = dynamic viewport height — fixes iOS Safari URL-bar reflow */}
      <div className="flex h-dvh bg-background overflow-hidden">
        <AppSidebar user={user} />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </UnitProvider>
  )
}
