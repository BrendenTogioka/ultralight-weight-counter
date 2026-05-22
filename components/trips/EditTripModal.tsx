'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Trip } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { backdropVariants, modalCardVariants } from '@/lib/motion'

interface Props {
  trip: Trip
  onClose: () => void
  onSaved: (trip: Trip) => void
}

export function EditTripModal({ trip, onClose, onSaved }: Props) {
  const [name, setName] = useState(trip.name)
  const [description, setDescription] = useState(trip.description ?? '')
  const [startDate, setStartDate] = useState(trip.trip_date ?? '')
  const [endDate, setEndDate] = useState(trip.trip_date_end ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Trip name is required')
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('trips')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        trip_date: startDate || null,
        trip_date_end: endDate || null,
      })
      .eq('id', trip.id)
      .select()
      .single()

    if (error) {
      toast.error('Failed to save trip')
      setSaving(false)
      return
    }
    toast.success('Trip updated')
    onSaved(data as Trip)
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
        className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Edit trip</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">
          <Field label="Trip name *">
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
              maxLength={100}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Description">
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputCls}
              maxLength={300}
              autoCapitalize="sentences"
              placeholder="Optional description"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate || undefined}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow'
