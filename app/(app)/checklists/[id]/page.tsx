import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ChecklistClient } from '@/components/checklists/ChecklistClient'
import type { Checklist } from '@/types'

interface Props {
  params: { id: string }
}

export default async function ChecklistPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: checklist } = await supabase
    .from('checklists')
    .select('*, checklist_items(*)')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .order('sort_order', { referencedTable: 'checklist_items', ascending: true })
    .single()

  if (!checklist) notFound()

  return <ChecklistClient checklist={checklist as Checklist} />
}
