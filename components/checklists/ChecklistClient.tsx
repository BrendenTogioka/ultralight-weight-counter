'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Checklist, ChecklistItem } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  checklist: Checklist
}

export function ChecklistClient({ checklist: initial }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ChecklistItem[]>(
    (initial.checklist_items ?? []) as ChecklistItem[]
  )
  const [name] = useState(initial.name)

  const checked = items.filter(i => i.checked).length
  const total = items.length
  const allDone = total > 0 && checked === total

  async function handleToggle(item: ChecklistItem) {
    const supabase = createClient()
    const { error } = await supabase
      .from('checklist_items')
      .update({ checked: !item.checked })
      .eq('id', item.id)

    if (error) { toast.error('Failed to update'); return }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }

  async function handleUncheckAll() {
    const supabase = createClient()
    const { error } = await supabase
      .from('checklist_items')
      .update({ checked: false })
      .eq('checklist_id', initial.id)
    if (error) { toast.error('Failed to reset'); return }
    setItems(prev => prev.map(i => ({ ...i, checked: false })))
    toast.success('All items unchecked')
  }

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('checklists').delete().eq('id', initial.id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Checklist deleted')
    router.push('/checklists')
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/checklists"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Checklists
        </Link>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {checked} of {total} packed
          {allDone && <span className="ml-2 text-primary font-medium">— all done! 🎉</span>}
        </p>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(checked / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      {checked > 0 && (
        <div className="mb-4">
          <button
            onClick={handleUncheckAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Uncheck all
          </button>
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">No items in this checklist.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1
            return (
              <button
                key={item.id}
                onClick={() => handleToggle(item)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/20 transition-colors text-left',
                  !isLast && 'border-b border-border',
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                    item.checked
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  )}
                >
                  {item.checked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Name + brand */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium transition-colors',
                    item.checked ? 'line-through text-muted-foreground' : 'text-foreground'
                  )}>
                    {item.name}
                  </p>
                  {item.brand && (
                    <p className={cn(
                      'text-xs transition-colors',
                      item.checked ? 'text-muted-foreground/50' : 'text-muted-foreground'
                    )}>
                      {item.brand}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Delete */}
      <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete checklist
        </button>
      </div>
    </div>
  )
}
