'use client'

import { useState, useEffect } from 'react'
import { X, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { GearItem } from '@/types'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'

interface TripRef { id: string; name: string }

interface Props {
  item: GearItem
  onClose: () => void
  onEdit: () => void
  onDeleted: (id: string) => void
}

export function GearDetailModal({ item, onClose, onEdit, onDeleted }: Props) {
  const { unit } = useUnit()
  const weightOz = toOz(item.weight_oz, item.weight_unit)
  const [trips, setTrips] = useState<TripRef[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('trip_items')
      .select('trips(id, name)')
      .eq('gear_item_id', item.id)
      .then(({ data }) => {
        const seen = new Set<string>()
        const result: TripRef[] = []
        data?.forEach((row: any) => {
          const t = row.trips
          if (t && !seen.has(t.id)) {
            seen.add(t.id)
            result.push({ id: t.id, name: t.name })
          }
        })
        setTrips(result)
      })
  }, [item.id])

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('gear_items').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success(`"${item.name}" deleted`)
    onDeleted(item.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        variants={modalCardVariants}
        initial="initial"
        animate="animate"
        className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold text-foreground truncate pr-4">{item.name}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Photo */}
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-secondary flex items-center justify-center">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-7xl">{CATEGORY_ICONS[item.category] ?? '📦'}</span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <StatBlock label="Weight" value={formatWeight(weightOz, unit, 2)} />
            <StatBlock label="Category" value={item.category} />
            {item.brand && <StatBlock label="Brand" value={item.brand} />}
            {item.type && <StatBlock label="Type" value={item.type} />}
          </div>

          {/* Notes */}
          {item.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Trips this item is in */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              In packs
            </p>
            {trips.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not added to any trips yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {trips.map(t => (
                  <Link
                    key={t.id}
                    href={`/trips/${t.id}`}
                    onClick={onClose}
                    className="text-xs bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded-full text-foreground transition-colors"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 border-t border-border">
            <button
              onClick={handleDelete}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-destructive/40 text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              onClick={onEdit}
              className="flex-1 inline-flex items-center justify-center gap-2 btn-primary px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/40 rounded-xl px-3.5 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
