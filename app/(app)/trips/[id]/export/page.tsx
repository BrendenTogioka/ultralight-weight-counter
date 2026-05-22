import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ExportClient } from '@/components/trips/ExportClient'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: trip } = await supabase
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
    .single()

  if (!trip) notFound()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('default_unit')
    .eq('user_id', user!.id)
    .single()

  return <ExportClient trip={trip} defaultUnit={settings?.default_unit ?? 'oz'} />
}
