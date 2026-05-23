import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import Link from 'next/link'
import { ClipboardList, ArrowRight } from 'lucide-react'
import type { Checklist } from '@/types'

export default async function ChecklistsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const { data: checklists, error } = await supabase
    .from('checklists')
    .select('*, checklist_items(id, checked)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-4">Checklists</h1>
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Run the migration SQL first to enable checklists.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            File: <code className="bg-secondary px-1 rounded">supabase/migrations/002_checklists_and_trip_date_range.sql</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Checklists</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {checklists?.length ?? 0} checklist{(checklists?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {!checklists || checklists.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">No checklists yet</p>
          <p className="text-sm text-muted-foreground">
            Open a trip and tap <strong>Checklist</strong> to create a packing list from it.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden flex flex-col">
          {checklists.map((cl: any, idx: number) => {
            const total = cl.checklist_items?.length ?? 0
            const checked = cl.checklist_items?.filter((i: any) => i.checked).length ?? 0
            const isLast = idx === checklists.length - 1
            return (
              <Link
                key={cl.id}
                href={`/checklists/${cl.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors ${!isLast ? 'border-b border-border' : ''}`}
              >
                <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cl.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {checked}/{total} packed
                  </p>
                </div>
                {total > 0 && (
                  <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${total > 0 ? (checked / total) * 100 : 0}%` }}
                    />
                  </div>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
