'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Download, Pencil, Trash2,
  ChevronDown, ChevronUp, ClipboardList,
  MoreHorizontal, Copy, GripVertical, List, LayoutGrid,
} from 'lucide-react'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Trip, TripItem, GearType, WearType, WeightUnit } from '@/types'
import {
  calculateWeightSummary, calculateCategoryWeights,
  formatWeight, formatWeightDisplay, getEffectiveWeightOz,
} from '@/lib/calculations'
import { CATEGORY_ICONS, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { AddItemToTripModal } from '@/components/trips/AddItemToTripModal'
import { TripItemDetailModal } from '@/components/trips/TripItemDetailModal'
import { TripItemCard } from '@/components/trips/TripItemCard'
import { EditTripModal } from '@/components/trips/EditTripModal'
import { WeightSummaryBar } from '@/components/trips/WeightSummaryBar'
import { WeightCharts } from '@/components/trips/WeightCharts'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants, staggerContainer, staggerItem } from '@/lib/motion'

type WearFilter = 'all' | WearType
type TripViewMode = 'list' | 'grid'

interface Props {
  trip: Trip
  gearTypes: GearType[]
  userId: string
}

// ─── Sortable item row ────────────────────────────────────────────────────────

interface SortableItemProps {
  item: TripItem
  isLast: boolean
  unit: WeightUnit
  onSelect: () => void
  onRemove: () => void
}

function SortableTripItem({ item, isLast, unit, onSelect, onRemove }: SortableItemProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const gear = item.gear_item!
  const effectiveOz = getEffectiveWeightOz(item)
  const totalOz = effectiveOz * item.quantity

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'px-4 py-3 group hover:bg-secondary/20 transition-colors',
        !isLast && 'border-b border-border',
        isDragging && 'opacity-50 bg-secondary/30 relative z-10',
      )}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="shrink-0 touch-none text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Name + brand */}
        <button onClick={onSelect} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium leading-tight hover:text-primary transition-colors">
            {gear.name}
          </p>
          {gear.brand && (
            <p className="text-xs text-muted-foreground leading-tight">{gear.brand}</p>
          )}
        </button>

        {/* Weight */}
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
          onClick={onRemove}
          aria-label={`Remove ${gear.name} from trip`}
          className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Wear type + qty badge */}
      <div className="mt-1 pl-6">
        <span className="text-xs text-muted-foreground capitalize">{item.wear_type}</span>
        {item.quantity > 1 && (
          <span className="text-xs text-muted-foreground"> · ×{item.quantity}</span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TripDetailClient({ trip: initialTrip, gearTypes, userId }: Props) {
  const router = useRouter()
  const { unit } = useUnit()
  const [trip, setTrip] = useState(initialTrip)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditTrip, setShowEditTrip] = useState(false)
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [wearFilter, setWearFilter] = useState<WearFilter>('all')
  const [tripViewMode, setTripViewMode] = useState<TripViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('trip_item_view') as TripViewMode) ?? 'list'
    }
    return 'list'
  })

  function changeTripViewMode(mode: TripViewMode) {
    setTripViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('trip_item_view', mode)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const items = (trip.trip_items ?? []) as TripItem[]

  const summary = useMemo(() => calculateWeightSummary(items), [items])
  const filteredItems = useMemo(() =>
    wearFilter === 'all' ? items : items.filter(i => i.wear_type === wearFilter),
    [items, wearFilter],
  )
  const categoryWeights = useMemo(() => calculateCategoryWeights(filteredItems), [filteredItems])

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  async function handleDragEnd(catItems: TripItem[], event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = catItems.findIndex(i => i.id === active.id)
    const newIndex = catItems.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(catItems, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sort_order: idx,
    }))

    // Optimistic update
    setTrip(prev => {
      const catIds = new Set(catItems.map(i => i.id))
      const others = (prev.trip_items ?? []).filter(i => !catIds.has(i.id))
      return { ...prev, trip_items: [...others, ...reordered] }
    })

    // Persist
    const supabase = createClient()
    await Promise.all(
      reordered.map(item =>
        supabase.from('trip_items').update({ sort_order: item.sort_order }).eq('id', item.id),
      ),
    )
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
    // Sort new item after existing ones by giving it a high sort_order
    const newSortOrder = items.length
    setTrip(prev => ({
      ...prev,
      trip_items: [...(prev.trip_items ?? []), { ...newItem, sort_order: newSortOrder }],
    }))
    // Persist the sort_order for the new item
    const supabase = createClient()
    supabase.from('trip_items').update({ sort_order: newSortOrder }).eq('id', newItem.id)
  }

  async function handleDeleteTrip() {
    if (!confirm(`Delete trip "${trip.name}"? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    if (error) return toast.error('Failed to delete trip')
    toast.success('Trip deleted')
    router.push('/dashboard')
  }

  async function handleDuplicateTrip() {
    const supabase = createClient()
    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name: `${trip.name} (Copy)`,
        description: trip.description,
        trip_date: trip.trip_date,
        trip_date_end: trip.trip_date_end,
        is_template: false,
        cloned_from_id: trip.id,
      })
      .select()
      .single()

    if (error || !newTrip) { toast.error('Failed to duplicate trip'); return }

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('trip_items').insert(
        items.map(item => ({
          trip_id: newTrip.id,
          gear_item_id: item.gear_item_id,
          user_id: userId,
          quantity: item.quantity,
          wear_type: item.wear_type,
          override_weight_oz: item.override_weight_oz,
          included: item.included,
          notes: item.notes,
          sort_order: item.sort_order ?? 0,
        })),
      )
      if (itemsError) toast.error('Trip created but items failed to copy')
    }

    toast.success('Trip duplicated!')
    router.push(`/trips/${newTrip.id}`)
  }

  async function handleCreateChecklist() {
    const supabase = createClient()
    const { data: checklist, error } = await supabase
      .from('checklists')
      .insert({ user_id: userId, trip_id: trip.id, name: `${trip.name} — Packing List` })
      .select()
      .single()

    if (error) { toast.error('Failed to create checklist'); return }

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

  const dateLabel = trip.trip_date
    ? trip.trip_date_end && trip.trip_date_end !== trip.trip_date
      ? `${formatTripDate(trip.trip_date)} – ${formatTripDate(trip.trip_date_end)}`
      : formatTripDate(trip.trip_date)
    : null

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-8 py-8 max-w-4xl mx-auto"
    >

      {/* ── Header ── */}
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop-only: Checklist + Export */}
          <button
            onClick={handleCreateChecklist}
            aria-label="Create packing checklist"
            title="Create checklist"
            className="hidden sm:inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Checklist
          </button>
          <Link
            href={`/trips/${trip.id}/export`}
            aria-label="Export trip"
            className="hidden sm:inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </Link>

          {/* Always: Add item */}
          <button
            onClick={() => setShowAddModal(true)}
            aria-label="Add item to trip"
            className="inline-flex items-center justify-center gap-2 btn-primary px-3 py-2 sm:px-4 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add item</span>
          </button>

          {/* Always: three-dot menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="More options"
                className="inline-flex items-center justify-center w-9 h-9 border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-48 bg-card border border-border rounded-xl shadow-xl p-1"
              >
                {/* Mobile-only items */}
                <DropdownMenu.Item
                  onSelect={handleCreateChecklist}
                  className="sm:hidden flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary cursor-pointer outline-none select-none"
                >
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Create checklist
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="sm:hidden h-px bg-border my-1 -mx-1" />
                <DropdownMenu.Item asChild className="sm:hidden">
                  <Link
                    href={`/trips/${trip.id}/export`}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary outline-none select-none"
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                    Export
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="sm:hidden h-px bg-border my-1 -mx-1" />

                {/* Always visible */}
                <DropdownMenu.Item
                  onSelect={handleDuplicateTrip}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-secondary cursor-pointer outline-none select-none"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  Duplicate trip
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1 -mx-1" />
                <DropdownMenu.Item
                  onSelect={handleDeleteTrip}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive rounded-lg hover:bg-destructive/10 cursor-pointer outline-none select-none"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete trip
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Featured image hero */}
      {trip.featured_image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl mb-6">
          <img
            src={trip.featured_image_url}
            alt={trip.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Weight summary */}
      <WeightSummaryBar summary={summary} unit={unit} />

      {/* Charts */}
      {items.length > 0 && (
        <WeightCharts items={items} unit={unit} tripId={trip.id} userId={userId} />
      )}

      {/* Wear type filter chips + view toggle */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          {(['all', 'base', 'worn', 'consumable'] as WearFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setWearFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                wearFilter === f
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {f === 'all' ? 'All items' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {/* View mode toggle */}
          <div className="flex items-center border border-input rounded-lg overflow-hidden ml-auto">
            <button
              onClick={() => changeTripViewMode('list')}
              aria-label="List view"
              className={cn(
                'p-1.5 transition-colors',
                tripViewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => changeTripViewMode('grid')}
              aria-label="Card view"
              className={cn(
                'p-1.5 transition-colors',
                tripViewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Category groups ── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mt-4 flex flex-col gap-4"
      >
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
            <motion.div key={category} variants={staggerItem} className="border border-border rounded-xl overflow-hidden">
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

              {/* Items — list or card view */}
              {!collapsed && tripViewMode === 'list' && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={event => handleDragEnd(catItems, event)}
                >
                  <SortableContext
                    items={catItems.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {catItems.map((item, idx) => (
                      <SortableTripItem
                        key={item.id}
                        item={item}
                        isLast={idx === catItems.length - 1}
                        unit={unit}
                        onSelect={() => setSelectedItem(item)}
                        onRemove={() => {
                          if (!confirm(`Remove "${item.gear_item?.name}" from trip?`)) return
                          const supabase = createClient()
                          supabase.from('trip_items').delete().eq('id', item.id).then(({ error }) => {
                            if (error) return toast.error('Failed to remove item')
                            handleRemoveItem(item.id)
                            toast.success('Item removed')
                          })
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {!collapsed && tripViewMode === 'grid' && (
                <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {catItems.map(item => (
                    <TripItemCard
                      key={item.id}
                      item={item}
                      unit={unit}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>

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
    </motion.div>
  )
}

function formatTripDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
