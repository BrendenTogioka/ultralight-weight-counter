import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { ChecklistClient } from '@/components/checklists/ChecklistClient'
import type { Checklist } from '@/types'

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, supabase] = await Promise.all([params, getUser(), createClient()])

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
