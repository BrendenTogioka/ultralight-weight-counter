'use client'

import Image from 'next/image'
import { Pencil, Trash2 } from 'lucide-react'
import type { GearItem } from '@/types'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  item: GearItem
  onEdit: () => void
  onDelete: (id: string) => void
}

export function GearItemCard({ item, onEdit, onDelete }: Props) {
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
    <div className="bg-card border border-border rounded-xl overflow-hidden group card-hover">
      {/* Image */}
      <div className="aspect-square bg-secondary flex items-center justify-center relative">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
        ) : (
          <span className="text-4xl">{CATEGORY_ICONS[item.category] ?? '📦'}</span>
        )}
        {/* Actions overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 bg-background/90 backdrop-blur rounded-md text-foreground hover:bg-background shadow-sm transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 bg-background/90 backdrop-blur rounded-md text-destructive hover:bg-destructive/10 shadow-sm transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        {item.brand && (
          <p className="text-xs text-muted-foreground">{item.brand}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {item.type ?? item.category}
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {formatWeight(weightOz, unit, 1)}
          </span>
        </div>
      </div>
    </div>
  )
}
