'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, SlidersHorizontal, LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import type { GearItem, GearType, LibraryFilters, SortField, SortDirection } from '@/types'
import { GEAR_CATEGORIES, CATEGORY_ICONS, cn } from '@/lib/utils'
import { formatWeight, toOz } from '@/lib/calculations'
import { useUnit } from '@/components/providers/UnitProvider'
import { GearItemCard } from '@/components/gear/GearItemCard'
import { GearItemRow } from '@/components/gear/GearItemRow'
import { AddEditGearModal } from '@/components/gear/AddEditGearModal'

type ViewMode = 'grid' | 'list'

interface Props {
  initialItems: GearItem[]
  gearTypes: GearType[]
  userId: string
}

export function GearLibraryClient({ initialItems, gearTypes, userId }: Props) {
  const { unit } = useUnit()
  const [items, setItems] = useState<GearItem[]>(initialItems)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gear_view') as ViewMode) ?? 'list'
    }
    return 'list'
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<GearItem | null>(null)
  const [filters, setFilters] = useState<LibraryFilters>({
    search: '',
    category: '',
    type: '',
    brand: '',
    sortField: 'created_at',
    sortDirection: 'desc',
  })

  const uniqueBrands = useMemo(() => {
    const brands = items.map(i => i.brand).filter(Boolean) as string[]
    return [...new Set(brands)].sort()
  }, [items])

  const uniqueTypes = useMemo(() => {
    return gearTypes.map(t => t.name)
  }, [gearTypes])

  const filteredItems = useMemo(() => {
    let result = [...items]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.type?.toLowerCase().includes(q)
      )
    }
    if (filters.category) result = result.filter(i => i.category === filters.category)
    if (filters.type) result = result.filter(i => i.type === filters.type)
    if (filters.brand) result = result.filter(i => i.brand === filters.brand)

    result.sort((a, b) => {
      let valA: string | number = 0
      let valB: string | number = 0

      switch (filters.sortField) {
        case 'weight':
          valA = toOz(a.weight_oz, a.weight_unit)
          valB = toOz(b.weight_oz, b.weight_unit)
          break
        case 'name':
          valA = a.name.toLowerCase()
          valB = b.name.toLowerCase()
          break
        case 'brand':
          valA = (a.brand ?? '').toLowerCase()
          valB = (b.brand ?? '').toLowerCase()
          break
        case 'category':
          valA = a.category.toLowerCase()
          valB = b.category.toLowerCase()
          break
        case 'created_at':
          valA = a.created_at
          valB = b.created_at
          break
      }

      if (valA < valB) return filters.sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return filters.sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [items, filters])

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gear_view', mode)
    }
  }

  function toggleSort(field: SortField) {
    setFilters(prev => ({
      ...prev,
      sortField: field,
      sortDirection:
        prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }))
  }

  function handleItemSaved(item: GearItem, isNew: boolean) {
    if (isNew) {
      setItems(prev => [item, ...prev])
    } else {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
    }
  }

  function handleItemDeleted(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Gear Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredItems.length} of {items.length} items
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowAddModal(true) }}
          className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add gear
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search gear…"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category filter */}
        <select
          value={filters.category}
          onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="">All categories</option>
          {GEAR_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filters.type}
          onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="">All types</option>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* Brand filter */}
        <select
          value={filters.brand}
          onChange={e => setFilters(prev => ({ ...prev, brand: e.target.value }))}
          className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="">All brands</option>
          {uniqueBrands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>

        {/* Sort by weight */}
        <button
          onClick={() => toggleSort('weight')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors',
            filters.sortField === 'weight'
              ? 'border-primary bg-accent text-accent-foreground'
              : 'border-input bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Weight {filters.sortField === 'weight' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
        </button>

        {/* View mode */}
        <div className="flex items-center border border-input rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => changeViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => changeViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Clear filters */}
      {(filters.search || filters.category || filters.type || filters.brand) && (
        <button
          onClick={() => setFilters(prev => ({ ...prev, search: '', category: '', type: '', brand: '' }))}
          className="text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          × Clear filters
        </button>
      )}

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <p className="font-medium text-foreground mb-1">No gear found</p>
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'Add your first piece of gear to get started.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <GearItemCard
              key={item.id}
              item={item}
              onEdit={() => { setEditingItem(item); setShowAddModal(true) }}
              onDelete={handleItemDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* List header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 sm:gap-4 px-4 py-2.5 bg-secondary/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="w-8" />
            <button className="text-left hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
              Name {filters.sortField === 'name' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="hidden sm:block hover:text-foreground transition-colors" onClick={() => toggleSort('brand')}>
              Brand {filters.sortField === 'brand' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="hidden sm:block hover:text-foreground transition-colors" onClick={() => toggleSort('category')}>
              Category {filters.sortField === 'category' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button className="hover:text-foreground transition-colors" onClick={() => toggleSort('weight')}>
              Weight {filters.sortField === 'weight' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
            </button>
            <div className="w-14 sm:w-16" />
          </div>
          {filteredItems.map((item, idx) => (
            <GearItemRow
              key={item.id}
              item={item}
              isLast={idx === filteredItems.length - 1}
              onEdit={() => { setEditingItem(item); setShowAddModal(true) }}
              onDelete={handleItemDeleted}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEditGearModal
          item={editingItem}
          gearTypes={gearTypes}
          userId={userId}
          onClose={() => { setShowAddModal(false); setEditingItem(null) }}
          onSaved={handleItemSaved}
        />
      )}
    </div>
  )
}
