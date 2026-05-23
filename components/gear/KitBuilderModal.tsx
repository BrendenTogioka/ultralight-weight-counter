'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Plus, Trash2, Loader2 } from 'lucide-react'
import type { GearItem, GearType, Kit, KitItem, WearType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'
import { toast } from 'sonner'

interface KitItemDraft {
  gear_item: GearItem
  quantity: number
  wear_type: WearType
}

interface Props {
  kit?: Kit | null           // null = create new
  userId: string
  gearTypes: GearType[]
  onClose: () => void
  onSaved: (kit: Kit) => void
}

export function KitBuilderModal({ kit, userId, gearTypes, onClose, onSaved }: Props) {
  const { unit } = useUnit()
  const [name, setName] = useState(kit?.name ?? '')
  const [description, setDescription] = useState(kit?.description ?? '')
  const [gearLibrary, setGearLibrary] = useState<GearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [draftItems, setDraftItems] = useState<KitItemDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'items' | 'add'>('items')

  // Load gear library and (if editing) existing kit items
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: gear }, { data: kitItems }] = await Promise.all([
        supabase.from('gear_items').select('*').eq('user_id', userId).order('name'),
        kit
          ? supabase
              .from('kit_items')
              .select('*, gear_item:gear_items(*)')
              .eq('kit_id', kit.id)
              .order('sort_order')
          : Promise.resolve({ data: [] }),
      ])
      setGearLibrary(gear ?? [])
      if (kitItems && kitItems.length > 0) {
        setDraftItems(
          (kitItems as KitItem[]).map(ki => ({
            gear_item: ki.gear_item!,
            quantity: ki.quantity,
            wear_type: ki.wear_type,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [userId, kit])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(inputValue), 250)
    return () => clearTimeout(t)
  }, [inputValue])

  const alreadyAddedIds = useMemo(() => new Set(draftItems.map(d => d.gear_item.id)), [draftItems])

  const filteredGear = useMemo(() => {
    let result = gearLibrary.filter(g => !alreadyAddedIds.has(g.id))
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.brand?.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [gearLibrary, alreadyAddedIds, search])

  function addItem(gear: GearItem) {
    setDraftItems(prev => [...prev, { gear_item: gear, quantity: 1, wear_type: 'base' }])
    setTab('items')
    setInputValue('')
  }

  function removeItem(gearId: string) {
    setDraftItems(prev => prev.filter(d => d.gear_item.id !== gearId))
  }

  function updateItem(gearId: string, patch: Partial<Pick<KitItemDraft, 'quantity' | 'wear_type'>>) {
    setDraftItems(prev => prev.map(d => d.gear_item.id === gearId ? { ...d, ...patch } : d))
  }

  const totalOz = useMemo(
    () => draftItems.reduce((sum, d) => sum + toOz(d.gear_item.weight_oz, d.gear_item.weight_unit) * d.quantity, 0),
    [draftItems]
  )

  async function handleSave() {
    if (!name.trim()) { toast.error('Kit name is required'); return }
    setSaving(true)
    const supabase = createClient()

    try {
      let savedKit: Kit

      if (kit) {
        // Update existing kit
        const { data, error } = await supabase
          .from('kits')
          .update({ name: name.trim(), description: description.trim() || null })
          .eq('id', kit.id)
          .select()
          .single()
        if (error || !data) throw error
        savedKit = data as Kit

        // Replace all kit_items
        await supabase.from('kit_items').delete().eq('kit_id', kit.id)
      } else {
        // Insert new kit
        const { data, error } = await supabase
          .from('kits')
          .insert({ user_id: userId, name: name.trim(), description: description.trim() || null })
          .select()
          .single()
        if (error || !data) throw error
        savedKit = data as Kit
      }

      if (draftItems.length > 0) {
        const { error: itemsError } = await supabase.from('kit_items').insert(
          draftItems.map((d, idx) => ({
            kit_id: savedKit.id,
            gear_item_id: d.gear_item.id,
            quantity: d.quantity,
            wear_type: d.wear_type,
            sort_order: idx,
          }))
        )
        if (itemsError) throw itemsError
      }

      toast.success(kit ? 'Kit updated!' : 'Kit created!')
      onSaved({ ...savedKit, kit_items: draftItems.map((d, idx) => ({
        id: '',
        kit_id: savedKit.id,
        gear_item_id: d.gear_item.id,
        quantity: d.quantity,
        wear_type: d.wear_type,
        sort_order: idx,
        created_at: '',
        gear_item: d.gear_item,
      })) })
    } catch (e) {
      console.error(e)
      toast.error('Failed to save kit')
    } finally {
      setSaving(false)
    }
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
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {kit ? 'Edit kit' : 'Create kit'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Kit meta */}
          <div className="px-6 py-4 border-b border-border space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Kit name *</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Sleep System, Cook Kit…"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input
                type="text"
                placeholder="Optional"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {(['items', 'add'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  tab === t
                    ? 'text-foreground border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'items' ? `Items (${draftItems.length})` : 'Add gear'}
              </button>
            ))}
          </div>

          {/* Items tab */}
          {tab === 'items' && (
            <div className="px-3 py-2">
              {draftItems.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground mb-3">No items yet</p>
                  <button
                    onClick={() => setTab('add')}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
                  >
                    <Plus className="h-4 w-4" />
                    Add gear
                  </button>
                </div>
              ) : (
                draftItems.map(d => {
                  const oz = toOz(d.gear_item.weight_oz, d.gear_item.weight_unit) * d.quantity
                  return (
                    <div key={d.gear_item.id} className="flex items-center gap-2 px-2 py-2.5 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-sm">
                        {CATEGORY_ICONS[d.gear_item.category] ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.gear_item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatWeight(oz, unit, 1)}</p>
                      </div>
                      <select
                        value={d.wear_type}
                        onChange={e => updateItem(d.gear_item.id, { wear_type: e.target.value as WearType })}
                        className="text-xs border border-input rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="base">Base</option>
                        <option value="worn">Worn</option>
                        <option value="consumable">Consumable</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateItem(d.gear_item.id, { quantity: Math.max(1, d.quantity - 1) })}
                          className="w-6 h-6 rounded border border-input text-xs hover:bg-secondary flex items-center justify-center">−</button>
                        <span className="w-5 text-center text-xs tabular-nums">{d.quantity}</span>
                        <button onClick={() => updateItem(d.gear_item.id, { quantity: d.quantity + 1 })}
                          className="w-6 h-6 rounded border border-input text-xs hover:bg-secondary flex items-center justify-center">+</button>
                      </div>
                      <button onClick={() => removeItem(d.gear_item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Add gear tab */}
          {tab === 'add' && (
            <div className="flex flex-col h-full">
              <div className="px-4 pt-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search gear…"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: 260 }}>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredGear.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {inputValue ? `No gear matching "${inputValue}"` : 'All gear already added'}
                  </p>
                ) : (
                  filteredGear.map(gear => {
                    const oz = toOz(gear.weight_oz, gear.weight_unit)
                    return (
                      <button
                        key={gear.id}
                        onClick={() => addItem(gear)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary/60 transition-colors mb-0.5"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-sm">
                          {CATEGORY_ICONS[gear.category] ?? '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{gear.name}</p>
                          <p className="text-xs text-muted-foreground">{[gear.brand, gear.category].filter(Boolean).join(' · ')}</p>
                        </div>
                        <span className="text-sm font-medium tabular-nums shrink-0">{formatWeight(oz, unit, 1)}</span>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 shrink-0 flex items-center justify-between gap-3">
          {draftItems.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {draftItems.length} item{draftItems.length !== 1 ? 's' : ''} · {formatWeight(totalOz, unit, 1)}
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {kit ? 'Save changes' : 'Create kit'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
