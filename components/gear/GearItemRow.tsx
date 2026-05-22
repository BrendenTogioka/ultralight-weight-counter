'use client'

import Image from 'next/image'
import { Pencil, Trash2 } from 'lucide-react'
import type { GearItem } from '@/types'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  item: GearItem
  isLast: boolean
  onEdit: () => void
  onDelete: (id: string) => void
}

export function GearItemRow({ item, isLast, onEdit, onDelete }: Props) {
  const { unit } = useUnit()
  const weightOz = toOz(item.weight_oz, item.weight_unit)

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('gear_items').delete().eq('id', item.id)
    if (error) {
      toast.error('Failed to delete item')
    } else {
      toast.success(`"${item.name}" deleted`)
      onDelete(item.id)
    }
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-secondary/30 transition-colors group',
        !isLast && 'border-b border-border'
      )}
    >
      {/* Image / icon */}
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary flex items-center justify-center shrink-0">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} width={32} height={32} className="object-cover w-full h-full" />
        ) : (
          <span className="text-base">{CATEGORY_ICONS[item.category] ?? '📦'}</span>
        )}
      </div>

      {/* Name + notes (+ brand/category on mobile) */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        {/* Show brand + category inline on mobile */}
        <p className="text-xs text-muted-foreground truncate sm:hidden">
          {[item.brand, item.category].filter(Boolean).join(' · ')}
        </p>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{item.notes}</p>
        )}
      </div>

      {/* Brand — desktop only */}
      <span className="hidden sm:block text-sm text-muted-foreground w-28 truncate text-right">
        {item.brand ?? '—'}
      </span>

      {/* Category + type — desktop only */}
      <div className="hidden sm:block text-right w-28">
        <span className="text-sm text-muted-foreground">{item.category}</span>
        {item.type && (
          <p className="text-xs text-muted-foreground/70">{item.type}</p>
        )}
      </div>

      {/* Weight */}
      <span className="text-sm font-medium text-foreground w-16 sm:w-20 text-right tabular-nums">
        {formatWeight(weightOz, unit)}
      </span>

      {/* Actions — always visible on mobile, hover-only on desktop */}
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-14 sm:w-16 justify-end">
        <button
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          aria-label={`Delete ${item.name}`}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
