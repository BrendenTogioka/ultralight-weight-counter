'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, Check } from 'lucide-react'
import type { GearItem, GearType, WeightUnit } from '@/types'
import { GEAR_CATEGORIES } from '@/lib/utils'
import { toOz } from '@/lib/calculations'
import { createClient } from '@/lib/supabase/client'
import { gearItemSchema, validateImageFile } from '@/lib/validation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'

interface Props {
  item: GearItem | null
  gearTypes: GearType[]
  userId: string
  onClose: () => void
  onSaved: (item: GearItem, isNew: boolean) => void
  // Optional: pre-fill some fields when adding from trip
  prefill?: Partial<GearItem>
}

const DEFAULT_TYPES = [
  'Backpack', 'Tent', 'Sleeping Bag', 'Sleeping Pad', 'Quilt', 'Tarp', 'Bivy',
  'Stove', 'Fuel', 'Cook Pot', 'Utensils', 'Water Filter', 'Water Bottle',
  'Reservoir', 'Headlamp', 'Trekking Poles', 'First Aid', 'Navigation',
  'Rain Jacket', 'Insulation Layer', 'Base Layer', 'Pants', 'Footwear',
  'Gaiters', 'Gloves', 'Hat', 'Sunglasses', 'Phone', 'Battery/Charger',
  'Camera', 'Bear Canister', 'Stuff Sack', 'Dry Bag', 'Cord/Rope',
  'Repair Kit', 'Hygiene', 'Sunscreen', 'Food', 'Snacks', 'Other',
]

export function AddEditGearModal({ item, gearTypes, userId, onClose, onSaved, prefill }: Props) {
  const isEdit = !!item
  const fileRef = useRef<HTMLInputElement>(null)

  const allTypeNames = [
    ...new Set([
      ...DEFAULT_TYPES,
      ...gearTypes.filter(t => t.user_id === userId).map(t => t.name),
    ]),
  ].sort()

  const [form, setForm] = useState({
    name: item?.name ?? prefill?.name ?? '',
    brand: item?.brand ?? prefill?.brand ?? '',
    category: item?.category ?? prefill?.category ?? 'Pack',
    type: item?.type ?? prefill?.type ?? '',
    customType: '',
    useCustomType: false,
    weight: item ? item.weight_oz.toString() : '',
    weight_unit: (item?.weight_unit ?? 'oz') as WeightUnit,
    notes: item?.notes ?? '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url ?? null)
  const [saving, setSaving] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<{ id: string; name: string }[]>([])
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isEdit) return // don't show trip selector when editing
    const supabase = createClient()
    supabase
      .from('trips')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_template', false)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setAvailableTrips(data ?? []))
  }, [isEdit, userId])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      toast.error(err)
      e.target.value = ''
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate with Zod
    const parsed = gearItemSchema.safeParse({
      name: form.name,
      brand: form.brand || undefined,
      category: form.category,
      type: (form.useCustomType ? form.customType : form.type) || undefined,
      weight: parseFloat(form.weight) || 0,
      weight_unit: form.weight_unit,
      notes: form.notes || undefined,
    })

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      toast.error(firstError.message)
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let image_url = item?.image_url ?? null

      // Upload image if new one selected
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('gear-images')
          .upload(path, imageFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('gear-images')
          .getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      const finalType = form.useCustomType ? form.customType.trim() : form.type
      const weightOz = toOz(parseFloat(form.weight) || 0, form.weight_unit)

      // Save custom type to gear_types if new
      if (form.useCustomType && form.customType.trim()) {
        const typeName = form.customType.trim()
        const exists = gearTypes.some(t => t.name.toLowerCase() === typeName.toLowerCase())
        if (!exists) {
          await supabase.from('gear_types').insert({
            user_id: userId,
            name: typeName,
          })
        }
      }

      const payload = {
        user_id: userId,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        type: finalType || null,
        weight_oz: weightOz,
        weight_unit: form.weight_unit,
        image_url,
        notes: form.notes.trim() || null,
      }

      if (isEdit) {
        const { data, error } = await supabase
          .from('gear_items')
          .update(payload)
          .eq('id', item.id)
          .select()
          .single()
        if (error) throw error
        toast.success('Gear item updated')
        onSaved(data, false)
      } else {
        const { data, error } = await supabase
          .from('gear_items')
          .insert(payload)
          .select()
          .single()
        if (error) throw error

        // Add to selected trips
        if (selectedTripIds.size > 0) {
          const tripItems = Array.from(selectedTripIds).map(tripId => ({
            trip_id: tripId,
            gear_item_id: data.id,
            user_id: userId,
            quantity: 1,
            wear_type: 'base' as const,
            included: true,
          }))
          await supabase.from('trip_items').insert(tripItems)
        }

        const tripCount = selectedTripIds.size
        toast.success(
          tripCount > 0
            ? `"${data.name}" added to library and ${tripCount} trip${tripCount !== 1 ? 's' : ''}`
            : `"${data.name}" added to library`
        )
        onSaved(data, true)
      }

      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
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
        className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Edit gear item' : 'Add gear item'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Image upload */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Photo (optional)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="w-40 aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden bg-secondary/30"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Click to upload</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Name */}
          <Field label="Name *">
            <input
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Zpacks Arc Haul Ultra" maxLength={100}
              autoCapitalize="words"
            />
          </Field>

          {/* Brand */}
          <Field label="Brand">
            <input
              value={form.brand}
              onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Zpacks" maxLength={80}
              autoCapitalize="words"
            />
          </Field>

          {/* Category */}
          <Field label="Category *">
            <select
              required
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className={inputCls}
            >
              {GEAR_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </Field>

          {/* Type */}
          <Field label="Type">
            {form.useCustomType ? (
              <div className="flex gap-2">
                <input
                  value={form.customType}
                  onChange={e => setForm(p => ({ ...p, customType: e.target.value }))}
                  className={inputCls}
                  placeholder="Enter custom type" maxLength={60}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, useCustomType: false, customType: '' }))}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select type…</option>
                  {allTypeNames.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, useCustomType: true }))}
                  className="text-xs text-primary hover:text-primary/80 shrink-0 whitespace-nowrap"
                >
                  + Custom
                </button>
              </div>
            )}
          </Field>

          {/* Weight */}
          <Field label="Weight *">
            <div className="flex gap-2">
              <input
                required
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.weight}
                onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className={inputCls}
                placeholder="0.00"
              />
              <select
                value={form.weight_unit}
                onChange={e => setForm(p => ({ ...p, weight_unit: e.target.value as WeightUnit }))}
                className="px-3 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
              >
                <option value="oz">oz</option>
                <option value="g">g</option>
              </select>
            </div>
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Optional notes…" maxLength={500}
            />
          </Field>

          {/* Add to trips (new items only) */}
          {!isEdit && availableTrips.length > 0 && (
            <Field label="Add to trips (optional)">
              <div className="border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {availableTrips.map((t, idx) => {
                  const checked = selectedTripIds.has(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTripIds(prev => {
                        const next = new Set(prev)
                        next.has(t.id) ? next.delete(t.id) : next.add(t.id)
                        return next
                      })}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors text-sm ${idx > 0 ? 'border-t border-border' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{t.name}</span>
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium btn-primary rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add to library'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
