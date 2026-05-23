'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, ArrowUpDown, LayoutGrid, List, Download, Upload, Pencil, Trash2, Package } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { GearItem, GearType, Kit, LibraryFilters, SortField } from '@/types'
import { GEAR_CATEGORIES, cn } from '@/lib/utils'
import { toOz, formatWeight } from '@/lib/calculations'
import { GearItemCard } from '@/components/gear/GearItemCard'
import { GearItemRow } from '@/components/gear/GearItemRow'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/motion'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUnit } from '@/components/providers/UnitProvider'

// ─── Lazy-loaded modals — only bundled when first opened ──────────────────────
const GearDetailModal = dynamic(() =>
  import('@/components/gear/GearDetailModal').then(m => ({ default: m.GearDetailModal }))
)
const AddEditGearModal = dynamic(() =>
  import('@/components/gear/AddEditGearModal').then(m => ({ default: m.AddEditGearModal }))
)
const KitBuilderModal = dynamic(() =>
  import('@/components/gear/KitBuilderModal').then(m => ({ default: m.KitBuilderModal }))
)
const GearImportModal = dynamic(() =>
  import('@/components/gear/GearImportModal').then(m => ({ default: m.GearImportModal }))
)
const ConfirmDialog = dynamic(() =>
  import('@/components/ui/ConfirmDialog').then(m => ({ default: m.ConfirmDialog }))
)

type ViewMode = 'grid' | 'list'
type LibraryTab = 'items' | 'kits'

interface Props {
  initialItems: GearItem[]
  initialKits: Kit[]
  gearTypes: GearType[]
  userId: string
}

export function GearLibraryClient({ initialItems, initialKits, gearTypes, userId }: Props) {
  const { unit } = useUnit()
  const [tab, setTab] = useState<LibraryTab>('items')
  const [items, setItems] = useState<GearItem[]>(initialItems)
  const [kits, setKits] = useState<Kit[]>(initialKits)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gear_view') as ViewMode) ?? 'list'
    }
    return 'list'
  })
  const [detailItem, setDetailItem] = useState<GearItem | null>(null)
  const [editingItem, setEditingItem] = useState<GearItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingKit, setEditingKit] = useState<Kit | null | undefined>(undefined) // undefined = closed
  const [showImportModal, setShowImportModal] = useState(false)
  const [kitToDelete, setKitToDelete] = useState<Kit | null>(null)
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

  const uniqueTypes = useMemo(() => gearTypes.map(t => t.name), [gearTypes])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(i =>
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
          valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break
        case 'brand':
          valA = (a.brand ?? '').toLowerCase(); valB = (b.brand ?? '').toLowerCase(); break
        case 'category':
          valA = a.category.toLowerCase(); valB = b.category.toLowerCase(); break
        case 'created_at':
          valA = a.created_at; valB = b.created_at; break
      }
      if (valA < valB) return filters.sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return filters.sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [items, filters])

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('gear_view', mode)
  }

  function toggleSort(field: SortField) {
    setFilters(prev => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }))
  }

  function handleItemSaved(item: GearItem, isNew: boolean) {
    if (isNew) {
      setItems(prev => [item, ...prev])
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? item : i))
      setDetailItem(item)
    }
  }

  function handleItemDeleted(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleEditFromDetail(item: GearItem) {
    setDetailItem(null)
    setEditingItem(item)
    setShowEditModal(true)
  }

  function handleKitSaved(kit: Kit) {
    setKits(prev => {
      const idx = prev.findIndex(k => k.id === kit.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = kit
        return next
      }
      return [kit, ...prev]
    })
    setEditingKit(undefined)
  }

  async function handleDeleteKit(kit: Kit) {
    const supabase = createClient()
    const { error } = await supabase.from('kits').delete().eq('id', kit.id)
    if (error) { toast.error('Failed to delete kit'); return }
    setKits(prev => prev.filter(k => k.id !== kit.id))
    toast.success('Kit deleted')
  }

  function handleImported(imported: GearItem[]) {
    setItems(prev => [...imported, ...prev])
  }

  function handleExportCSV() {
    if (items.length === 0) { toast.error('No gear to export'); return }
    const rows = [
      ['name', 'brand', 'category', 'type', 'weight_oz', 'weight_unit', 'notes'],
      ...items.map(i => [
        i.name,
        i.brand ?? '',
        i.category,
        i.type ?? '',
        String(i.weight_oz),
        i.weight_unit,
        i.notes ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gear-library-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${items.length} items`)
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-8 py-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Gear Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tab === 'items'
              ? `${filteredItems.length} of ${items.length} items`
              : `${kits.length} kit${kits.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'items' && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                title="Import CSV"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={handleExportCSV}
                title="Export CSV"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => { setEditingItem(null); setShowEditModal(true) }}
                className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add gear
              </button>
            </>
          )}
          {tab === 'kits' && (
            <button
              onClick={() => setEditingKit(null)}
              className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create kit
            </button>
          )}
        </div>
      </div>

      {/* Library tab switcher */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl mb-6 w-fit">
        {(['items', 'kits'] as LibraryTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Items tab ── */}
      {tab === 'items' && (
        <>
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
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

            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="pl-3 pr-10 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="">All categories</option>
              {GEAR_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select
              value={filters.type}
              onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="pl-3 pr-10 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="">All types</option>
              {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>

            <select
              value={filters.brand}
              onChange={e => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              className="pl-3 pr-10 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="">All brands</option>
              {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>

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

            <div className="flex items-center border border-input rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => changeViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => changeViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {(filters.search || filters.category || filters.type || filters.brand) && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '', category: '', type: '', brand: '' }))}
              className="text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              × Clear filters
            </button>
          )}

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
                <GearItemCard key={item.id} item={item} onClick={() => setDetailItem(item)} />
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 px-4 py-2.5 bg-secondary/50 border-b border-border text-xs font-medium text-muted-foreground">
                <div className="w-8" />
                <button className="text-left hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
                  Name {filters.sortField === 'name' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button className="hidden sm:block w-28 text-right hover:text-foreground transition-colors" onClick={() => toggleSort('brand')}>
                  Brand {filters.sortField === 'brand' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button className="hidden sm:block w-28 text-right hover:text-foreground transition-colors" onClick={() => toggleSort('category')}>
                  Category {filters.sortField === 'category' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
                <button className="w-16 sm:w-20 text-right hover:text-foreground transition-colors" onClick={() => toggleSort('weight')}>
                  Weight {filters.sortField === 'weight' ? (filters.sortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
              </div>
              {filteredItems.map((item, idx) => (
                <GearItemRow
                  key={item.id}
                  item={item}
                  isLast={idx === filteredItems.length - 1}
                  onClick={() => setDetailItem(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Kits tab ── */}
      {tab === 'kits' && (
        <>
          {kits.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-16 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-foreground mb-1">No kits yet</p>
              <p className="text-sm text-muted-foreground mb-5">
                Group gear into reusable kits — sleep system, cook kit, etc.
              </p>
              <button
                onClick={() => setEditingKit(null)}
                className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create first kit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kits.map(kit => {
                const kitItems = kit.kit_items ?? []
                const totalOz = kitItems.reduce((sum, ki) => {
                  const oz = ki.gear_item ? toOz(ki.gear_item.weight_oz, ki.gear_item.weight_unit) * ki.quantity : 0
                  return sum + oz
                }, 0)
                return (
                  <div key={kit.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{kit.name}</p>
                        {kit.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{kit.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingKit(kit)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label="Edit kit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setKitToDelete(kit)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Delete kit"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {kitItems.length > 0 ? (
                      <>
                        <div className="space-y-1">
                          {kitItems.slice(0, 4).map(ki => (
                            <div key={ki.id} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground truncate flex-1">{ki.gear_item?.name}</span>
                              {ki.quantity > 1 && <span className="text-xs text-muted-foreground">×{ki.quantity}</span>}
                            </div>
                          ))}
                          {kitItems.length > 4 && (
                            <p className="text-xs text-muted-foreground">+{kitItems.length - 4} more</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                          <span className="text-xs text-muted-foreground">{kitItems.length} item{kitItems.length !== 1 ? 's' : ''}</span>
                          <span className="text-sm font-semibold tabular-nums">{formatWeight(totalOz, unit, 1)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No items</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Gear detail modal */}
      {detailItem && (
        <GearDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => handleEditFromDetail(detailItem)}
          onDeleted={id => { handleItemDeleted(id); setDetailItem(null) }}
        />
      )}

      {/* Add / Edit gear modal */}
      {showEditModal && (
        <AddEditGearModal
          item={editingItem}
          gearTypes={gearTypes}
          userId={userId}
          onClose={() => { setShowEditModal(false); setEditingItem(null) }}
          onSaved={handleItemSaved}
        />
      )}

      {/* Kit builder modal */}
      {editingKit !== undefined && (
        <KitBuilderModal
          kit={editingKit}
          userId={userId}
          gearTypes={gearTypes}
          onClose={() => setEditingKit(undefined)}
          onSaved={handleKitSaved}
        />
      )}

      {/* Delete kit confirmation */}
      {kitToDelete && (
        <ConfirmDialog
          title="Delete kit?"
          message={`"${kitToDelete.name}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={() => { const k = kitToDelete; setKitToDelete(null); handleDeleteKit(k) }}
          onCancel={() => setKitToDelete(null)}
        />
      )}

      {/* Import modal */}
      {showImportModal && (
        <GearImportModal
          userId={userId}
          existingItems={items}
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
        />
      )}
    </motion.div>
  )
}
