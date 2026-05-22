'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Plus, Loader2 } from 'lucide-react'
import type { GearItem, GearType, TripItem, WearType, WeightUnit } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS, GEAR_CATEGORIES, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { AddEditGearModal } from '@/components/gear/AddEditGearModal'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'
import { toast } from 'sonner'

interface Props {
  tripId: string
  userId: string
  gearTypes: GearType[]
  existingGearIds: string[]
  onClose: () => void
  onItemAdded: (item: TripItem) => void
}

export function AddItemToTripModal({
  tripId, userId, gearTypes, existingGearIds, onClose, onItemAdded,
}: Props) {
  const { unit } = useUnit()
  const [tab, setTab] = useState<'search' | 'new'>('search')
  const [gearLibrary, setGearLibrary] = useState<GearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GearItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [wearType, setWearType] = useState<WearType>('base')
  const [adding, setAdding] = useState(false)
  const [showNewGearModal, setShowNewGearModal] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('gear_items')
        .select('*')
        .eq('user_id', userId)
        .order('name')
      setGearLibrary(data ?? [])
      setLoading(false)
    }
    load()
  }, [userId])

  const filtered = useMemo(() => {
    return gearLibrary.filter(item => {
      const alreadyAdded = existingGearIds.includes(item.id)
      if (alreadyAdded) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q)
      )
    })
  }, [gearLibrary, search, existingGearIds])

  async function handleAdd() {
    if (!selected) return
    setAdding(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('trip_items')
      .insert({
        trip_id: tripId,
        gear_item_id: selected.id,
        user_id: userId,
        quantity,
        wear_type: wearType,
        included: true,
      })
      .select(`*, gear_item:gear_items(*)`)
      .single()

    if (error) {
      toast.error('Failed to add item')
      setAdding(false)
      return
    }

    toast.success(`"${selected.name}" added to trip`)
    onItemAdded(data)
    onClose()
  }

  function handleNewGearSaved(item: GearItem) {
    setGearLibrary(prev => [item, ...prev])
    setSelected(item)
    setShowNewGearModal(false)
    setTab('search')
  }

  if (showNewGearModal) {
    return (
      <AddEditGearModal
        item={null}
        gearTypes={gearTypes}
        userId={userId}
        onClose={() => setShowNewGearModal(false)}
        onSaved={handleNewGearSaved}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Add item to trip</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Search your gear library…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Gear list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground mb-3">
                {search ? `No gear matching "${search}"` : 'All library items are already in this trip'}
              </p>
              <button
                onClick={() => setShowNewGearModal(true)}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="h-4 w-4" />
                Add new gear item
              </button>
            </div>
          ) : (
            filtered.map(item => {
              const weightOz = toOz(item.weight_oz, item.weight_unit)
              const isSelected = selected?.id === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSelected(isSelected ? null : item)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors mb-0.5',
                    isSelected
                      ? 'bg-accent'
                      : 'hover:bg-secondary/60'
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-lg">
                    {CATEGORY_ICONS[item.category] ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.brand, item.category, item.type].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground tabular-nums shrink-0">
                    {formatWeight(weightOz, unit, 1)}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Add new gear link */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-2 border-t border-border shrink-0">
            <button
              onClick={() => setShowNewGearModal(true)}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add new gear item to library
            </button>
          </div>
        )}

        {/* Selected item config + add button */}
        {selected && (
          <div className="px-6 py-4 border-t border-border bg-secondary/20 shrink-0 flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <div className="flex items-center gap-4">
              {/* Wear type */}
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">Type</label>
                <select
                  value={wearType}
                  onChange={e => setWearType(e.target.value as WearType)}
                  className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="base">Base weight</option>
                  <option value="worn">Worn</option>
                  <option value="consumable">Consumable</option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Qty</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-9 rounded-lg border border-input text-sm hover:bg-secondary transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center text-sm border border-input rounded-lg px-2 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-9 rounded-lg border border-input text-sm hover:bg-secondary transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full btn-primary py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Add to trip
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
