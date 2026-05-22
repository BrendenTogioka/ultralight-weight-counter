import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ChecklistClient } from '@/components/checklists/ChecklistClient'
import type { Checklist } from '@/types'

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: checklist } = await supabase
    .from('checklists')
    .select('*, checklist_items(*)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .order('sort_order', { referencedTable: 'checklist_items', ascending: true })
    .single()

  if (!checklist) notFound()

  return <ChecklistClient checklist={checklist as Checklist} />
}
