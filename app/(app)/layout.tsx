import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { UnitProvider } from '@/components/providers/UnitProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user settings
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
