'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Download, Pencil, Trash2,
  ChevronDown, ChevronUp, ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import type { Trip, TripItem, GearType, WearType } from '@/types'
import {
  calculateWeightSummary, calculateCategoryWeights,
  formatWeight, formatWeightDisplay, getEffectiveWeightOz
} from '@/lib/calculations'
import { CATEGORY_ICONS, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { AddItemToTripModal } from '@/components/trips/AddItemToTripModal'
import { TripItemDetailModal } from '@/components/trips/TripItemDetailModal'
import { EditTripModal } from '@/components/trips/EditTripModal'
import { WeightSummaryBar } from '@/components/trips/WeightSummaryBar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type WearFilter = 'all' | WearType

interface Props {
  trip: Trip
  gearTypes: GearType[]
  userId: string
}

export function TripDetailClient({ trip: initialTrip, gearTypes, userId }: Props) {
  const router = useRouter()
  const { unit } = useUnit()
  const [trip, setTrip] = useState(initialTrip)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditTrip, setShowEditTrip] = useState(false)
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [wearFilter, setWearFilter] = useState<WearFilter>('all')

  const items = (trip.trip_items ?? []) as TripItem[]

  // Summary always reflects all items; list respects filter
  const summary = useMemo(() => calculateWeightSummary(items), [items])
  const filteredItems = useMemo(() =>
    wearFilter === 'all' ? items : items.filter(i => i.wear_type === wearFilter),
    [items, wearFilter]
  )
  const categoryWeights = useMemo(() => calculateCategoryWeights(filteredItems), [filteredItems])

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  async function handleUpdateWearType(item: TripItem, wear_type: WearType) {
    const supabase = createClient()
    const { error } = await supabase.from('trip_items').update({ wear_type }).eq('id', item.id)
    if (error) return toast.error('Failed to update item')
    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.map(i => i.id === item.id ? { ...i, wear_type } : i),
    }))
  }

  async function handleUpdateQuantity(item: TripItem, quantity: number) {
    if (quantity < 1) return
    const supabase = createClient()
    const { error } = await supabase.from('trip_items').update({ quantity }).eq('id', item.id)
    if (error) return toast.error('Failed to update quantity')
    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.map(i => i.id === item.id ? { ...i, quantity } : i),
    }))
  }

  async function handleRemoveItem(itemId: string) {
    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.filter(i => i.id !== itemId),
    }))
  }

  function handleItemUpdated(updated: TripItem) {
    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.map(i => i.id === updated.id ? updated : i),
    }))
  }

  function handleItemAdded(newItem: TripItem) {
    setTrip(prev => ({
      ...prev,
      trip_items: [...(prev.trip_items ?? []), newItem],
    }))
  }

  async function handleDeleteTrip() {
    if (!confirm(`Delete trip "${trip.name}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    if (error) return toast.error('Failed to delete trip')
    toast.success('Trip deleted')
    router.push('/dashboard')
  }

  async function handleCreateChecklist() {
    const supabase = createClient()
    const { data: checklist, error } = await supabase
      .from('checklists')
      .insert({ user_id: userId, trip_id: trip.id, name: `${trip.name} — Packing List` })
      .select()
      .single()

    if (error) {
      toast.error('Failed to create checklist. Make sure you have run the migration SQL.')
      return
    }

    const checklistItems = items.map((item, idx) => ({
      checklist_id: checklist.id,
      name: item.gear_item?.name ?? '',
      brand: item.gear_item?.brand ?? null,
      sort_order: idx,
      checked: false,
    }))

    await supabase.from('checklist_items').insert(checklistItems)
    toast.success('Checklist created!')
    router.push(`/checklists/${checklist.id}`)
  }

  // Format date range for display
  const dateLabel = trip.trip_date
    ? trip.trip_date_end && trip.trip_date_end !== trip.trip_date
      ? `${formatTripDate(trip.trip_date)} – ${formatTripDate(trip.trip_date_end)}`
      : formatTripDate(trip.trip_date)
    : null

  return (
    <div className="px-4 sm:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0 flex-1 pr-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight truncate">{trip.name}</h1>
            <button
              onClick={() => setShowEditTrip(true)}
              aria-label="Edit trip details"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-lg hover:bg-secondary"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          {trip.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{trip.description}</p>
          )}
          {dateLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
          )}
        </div>

        <div className="flex flex-row items-center gap-2 shrink-0">
          <button
            onClick={handleCreateChecklist}
            aria-label="Create packing checklist"
            title="Create checklist"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist</span>
          </button>
          <Link
            href={`/trips/${trip.id}/export`}
            aria-label="Export trip"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            aria-label="Add item to trip"
            className="inline-flex items-center justify-center gap-2 btn-primary px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add item</span>
          </button>
        </div>
      </div>

      {/* Weight summary */}
      <WeightSummaryBar summary={summary} unit={unit} />

      {/* Wear type filter chips */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mt-5">
          {(['all', 'base', 'worn', 'consumable'] as WearFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setWearFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                wearFilter === f
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              {f === 'all' ? 'All items' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Category groups */}
      <div className="mt-4 flex flex-col gap-4">
        {categoryWeights.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-16 text-center">
            <p className="font-medium text-foreground mb-1">
              {items.length === 0 ? 'No items yet' : `No ${wearFilter} items`}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {items.length === 0
                ? 'Add items from your gear library or create new ones.'
                : 'Try a different filter or add more gear to this trip.'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            )}
          </div>
        )}

        {categoryWeights.map(({ category, weight_oz, items: catItems }) => {
          const collapsed = collapsedCategories.has(category)
          return (
            <div key={category} className="border border-border rounded-xl overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${category}`}
                className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{CATEGORY_ICONS[category] ?? '📦'}</span>
                  <span className="text-sm font-medium text-foreground">{category}</span>
                  <span className="text-xs text-muted-foreground">({catItems.length})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {(() => {
                      const { primary, secondary } = formatWeightDisplay(weight_oz, unit, 2)
                      return (
                        <>
                          <span className="text-sm font-semibold text-foreground tabular-nums">{primary}</span>
                          {secondary && <p className="text-xs text-muted-foreground tabular-nums leading-tight">{secondary}</p>}
                        </>
                      )
                    })()}
                  </div>
                  {collapsed
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Items */}
              {!collapsed && (
                <div>
                  {catItems.map((item, idx) => {
                    const gear = item.gear_item!
                    const effectiveOz = getEffectiveWeightOz(item)
                    const totalOz = effectiveOz * item.quantity
                    const isLast = idx === catItems.length - 1

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'px-4 py-3 group hover:bg-secondary/20 transition-colors',
                          !isLast && 'border-b border-border'
                        )}
                      >
                        {/* Row 1: name (clickable) + weight + remove */}
                        <div className="flex items-center gap-3">
                          {/* Name + brand — click to open detail modal */}
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-medium leading-tight hover:text-primary transition-colors">
                              {gear.name}
                            </p>
                            {gear.brand && (
                              <p className="text-xs text-muted-foreground leading-tight">{gear.brand}</p>
                            )}
                          </button>

                          {/* Weight — oz only for individual items */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-foreground tabular-nums">
                              {formatWeight(totalOz, unit, 1)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground tabular-nums leading-tight">
                                {formatWeight(effectiveOz, unit, 1)} ea
                              </p>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => {
                              if (!confirm(`Remove "${gear.name}" from trip?`)) return
                              const supabase = createClient()
                              supabase.from('trip_items').delete().eq('id', item.id).then(({ error }) => {
                                if (error) return toast.error('Failed to remove item')
                                handleRemoveItem(item.id)
                                toast.success('Item removed')
                              })
                            }}
                            aria-label={`Remove ${gear.name} from trip`}
                            className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Wear type badge */}
                        <div className="mt-1">
                          <span className="text-xs text-muted-foreground capitalize">{item.wear_type}</span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground"> · ×{item.quantity}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete trip */}
      <div className="mt-10 pt-6 border-t border-border">
        <button
          onClick={handleDeleteTrip}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Delete this trip
        </button>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddItemToTripModal
          tripId={trip.id}
          userId={userId}
          gearTypes={gearTypes}
          existingGearIds={items.map(i => i.gear_item_id)}
          onClose={() => setShowAddModal(false)}
          onItemAdded={handleItemAdded}
        />
      )}

      {selectedItem && (
        <TripItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdated={updated => { handleItemUpdated(updated); setSelectedItem(null) }}
          onRemoved={id => { handleRemoveItem(id); setSelectedItem(null) }}
        />
      )}

      {showEditTrip && (
        <EditTripModal
          trip={trip}
          onClose={() => setShowEditTrip(false)}
          onSaved={updated => { setTrip(prev => ({ ...prev, ...updated })); setShowEditTrip(false) }}
        />
      )}
    </div>
  )
}

function formatTripDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
