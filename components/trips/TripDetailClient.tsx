'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Download,
  ChevronDown, ChevronUp, Trash2
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
import { WeightSummaryBar } from '@/components/trips/WeightSummaryBar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const items = (trip.trip_items ?? []) as TripItem[]
  const summary = useMemo(() => calculateWeightSummary(items), [items])
  const categoryWeights = useMemo(() => calculateCategoryWeights(items), [items])

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  async function handleToggleIncluded(item: TripItem) {
    const supabase = createClient()
    const { error } = await supabase
      .from('trip_items')
      .update({ included: !item.included })
      .eq('id', item.id)

    if (error) return toast.error('Failed to update item')

    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.map(i =>
        i.id === item.id ? { ...i, included: !i.included } : i
      ),
    }))
  }

  async function handleUpdateWearType(item: TripItem, wear_type: WearType) {
    const supabase = createClient()
    const { error } = await supabase
      .from('trip_items')
      .update({ wear_type })
      .eq('id', item.id)

    if (error) return toast.error('Failed to update item')

    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.map(i =>
        i.id === item.id ? { ...i, wear_type } : i
      ),
    }))
  }

  async function handleUpdateQuantity(item: TripItem, quantity: number) {
    if (quantity < 1) return
    const supabase = createClient()
    const { error } = await supabase
      .from('trip_items')
      .update({ quantity })
      .eq('id', item.id)

    if (error) return toast.error('Failed to update quantity')

    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.map(i =>
        i.id === item.id ? { ...i, quantity } : i
      ),
    }))
  }

  async function handleRemoveItem(item: TripItem) {
    const supabase = createClient()
    const { error } = await supabase.from('trip_items').delete().eq('id', item.id)

    if (error) return toast.error('Failed to remove item')

    setTrip(prev => ({
      ...prev,
      trip_items: prev.trip_items?.filter(i => i.id !== item.id),
    }))
    toast.success('Item removed from trip')
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

  return (
    <div className="px-4 sm:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{trip.name}</h1>
          {trip.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{trip.description}</p>
          )}
        </div>
        <div className="flex flex-row items-center gap-2">
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

      {/* Category groups */}
      <div className="mt-8 flex flex-col gap-4">
        {categoryWeights.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-16 text-center">
            <p className="font-medium text-foreground mb-1">No items yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Add items from your gear library or create new ones.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
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
                  {collapsed ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
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
                    const { primary: weightPrimary, secondary: weightSecondary } = formatWeightDisplay(totalOz, unit, 2)

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'px-4 py-3 group hover:bg-secondary/20 transition-colors',
                          !isLast && 'border-b border-border',
                          !item.included && 'opacity-50'
                        )}
                      >
                        {/* Row 1: checkbox + name + weight + remove */}
                        <div className="flex items-center gap-3">
                          {/* Include toggle */}
                          <button
                            onClick={() => handleToggleIncluded(item)}
                            aria-label={item.included ? `Exclude ${gear.name}` : `Include ${gear.name}`}
                            className={cn(
                              'w-5 h-5 rounded border-2 shrink-0 transition-colors flex items-center justify-center',
                              item.included
                                ? 'bg-primary border-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {item.included && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* Name + brand */}
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium leading-tight', !item.included && 'line-through')}>
                              {gear.name}
                            </p>
                            {gear.brand && (
                              <p className="text-xs text-muted-foreground leading-tight">{gear.brand}</p>
                            )}
                          </div>

                          {/* Weight */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-foreground tabular-nums">{weightPrimary}</p>
                            {weightSecondary && (
                              <p className="text-xs text-muted-foreground tabular-nums leading-tight">{weightSecondary}</p>
                            )}
                            {item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground tabular-nums leading-tight">
                                {formatWeightDisplay(effectiveOz, unit, 1).primary} ea
                              </p>
                            )}
                          </div>

                          {/* Remove — always visible on mobile, hover-only on desktop */}
                          <button
                            onClick={() => handleRemoveItem(item)}
                            aria-label={`Remove ${gear.name} from trip`}
                            className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Row 2: wear type + quantity */}
                        <div className="flex items-center gap-2 mt-1.5 pl-8">
                          <select
                            value={item.wear_type}
                            onChange={e => handleUpdateWearType(item, e.target.value as WearType)}
                            aria-label={`Wear type for ${gear.name}`}
                            className="text-xs border border-input rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="base">Base</option>
                            <option value="worn">Worn</option>
                            <option value="consumable">Consumable</option>
                          </select>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease quantity of ${gear.name}`}
                              className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="text-sm font-medium w-5 text-center tabular-nums" aria-label={`Quantity: ${item.quantity}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              aria-label={`Increase quantity of ${gear.name}`}
                              className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs"
                            >
                              +
                            </button>
                          </div>
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

      {/* Add item modal */}
      {showAddModal && (
        <AddItemToTripModal
          tripId={trip.id}
          userId={userId}
          gearTypes={gearTypes}
          existingGearIds={(items.map(i => i.gear_item_id))}
          onClose={() => setShowAddModal(false)}
          onItemAdded={handleItemAdded}
        />
      )}
    </div>
  )
}
