'use client'

import { useState } from 'react'
import { X, Trash2, Pencil } from 'lucide-react'
import type { TripItem, WearType } from '@/types'
import { getEffectiveWeightOz, formatWeight } from '@/lib/calculations'
import { CATEGORY_ICONS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Props {
  item: TripItem
  onClose: () => void
  onUpdated: (item: TripItem) => void
  onRemoved: (id: string) => void
  onEditGear?: () => void
}

export function TripItemDetailModal({ item, onClose, onUpdated, onRemoved, onEditGear }: Props) {
  const gear = item.gear_item!
  const [wearType, setWearType] = useState<WearType>(item.wear_type)
  const [quantity, setQuantity] = useState(item.quantity)
  const [saving, setSaving] = useState(false)

  const weightOz = getEffectiveWeightOz(item)
  const totalOz = weightOz * quantity
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleSave() {
    if (wearType === item.wear_type && quantity === item.quantity) {
      onClose()
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('trip_items')
      .update({ wear_type: wearType, quantity })
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to update item')
      setSaving(false)
      return
    }
    onUpdated({ ...item, wear_type: wearType, quantity })
    toast.success('Item updated')
    onClose()
  }

  async function handleRemove() {
    const supabase = createClient()
    const { error } = await supabase.from('trip_items').delete().eq('id', item.id)
    if (error) { toast.error('Failed to remove item'); return }
    onRemoved(item.id)
    toast.success('Item removed')
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
        className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground truncate pr-2">{gear.name}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Image + basic info — image takes ~45% width */}
          <div className="flex gap-4 items-center">
            <div className="w-[45%] aspect-square rounded-xl overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
              {gear.image_url ? (
                <img src={gear.image_url} alt={gear.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{CATEGORY_ICONS[gear.category] ?? '📦'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {gear.brand && <p className="text-sm text-muted-foreground">{gear.brand}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {gear.category}{gear.type ? ` · ${gear.type}` : ''}
              </p>
              <p className="text-sm font-semibold text-foreground mt-2 tabular-nums">
                {formatWeight(weightOz, 'oz', 1)} each
              </p>
              {gear.notes && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{gear.notes}</p>
              )}
            </div>
          </div>

          {/* Wear type */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Wear Type</p>
            <div className="flex gap-2">
              {(['base', 'worn', 'consumable'] as WearType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setWearType(t)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                    wearType === t
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 text-base"
              >
                −
              </button>
              <span className="text-xl font-semibold tabular-nums w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-base"
              >
                +
              </button>
              {quantity > 1 && (
                <span className="text-sm text-muted-foreground tabular-nums ml-1">
                  = {formatWeight(totalOz, 'oz', 1)} total
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={() => setConfirmOpen(true)}
            aria-label="Remove from trip"
            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {onEditGear && (
            <button
              onClick={onEditGear}
              aria-label="Edit gear item"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit gear
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm btn-primary rounded-lg font-medium disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </motion.div>

      {confirmOpen && (
        <ConfirmDialog
          title="Remove item?"
          message={`Remove "${gear.name}" from this trip?`}
          confirmLabel="Remove"
          onConfirm={() => { setConfirmOpen(false); handleRemove() }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  )
}
