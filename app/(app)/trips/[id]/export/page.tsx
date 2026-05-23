import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { ExportClient } from '@/components/trips/ExportClient'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, supabase] = await Promise.all([params, getUser(), createClient()])

  const [{ data: trip }, { data: settings }] = await Promise.all([
    supabase
      .from('trips')
      .select(`*, trip_items (*, gear_item:gear_items (*))`)
      .eq('id', id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('user_settings')
      .select('default_unit')
      .eq('user_id', user!.id)
      .single(),
  ])

  if (!trip) notFound()

  return <ExportClient trip={trip} defaultUnit={settings?.default_unit ?? 'oz'} />
}
