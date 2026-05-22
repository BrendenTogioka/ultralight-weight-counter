'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, FileStack, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { NewTripMode } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { tripSchema } from '@/lib/validation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/motion'

interface ExistingTrip {
  id: string
  name: string
  is_template: boolean
  trip_date: string | null
}

interface Props {
  existingTrips: ExistingTrip[]
  userId: string
}

export function NewTripClient({ existingTrips, userId }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<NewTripMode | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [saving, setSaving] = useState(false)

  const templates = existingTrips.filter(t => t.is_template)
  const allTrips = existingTrips.filter(t => !t.is_template)

  async function handleCreate() {
    const parsed = tripSchema.safeParse({ name, description, trip_date: date, is_template: isTemplate })
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message)
      return
    }
    if ((mode === 'template' || mode === 'duplicate') && !selectedSourceId) {
      return toast.error('Please select a source trip')
    }

    setSaving(true)
    const supabase = createClient()

    try {
      // Create the trip
      const { data: newTrip, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: description.trim() || null,
          trip_date: date || null,
          is_template: isTemplate,
          cloned_from_id: selectedSourceId || null,
        })
        .select()
        .single()

      if (error) throw error

      // Clone items from source trip
      if ((mode === 'template' || mode === 'duplicate') && selectedSourceId) {
        const { data: sourceItems } = await supabase
          .from('trip_items')
          .select('*')
          .eq('trip_id', selectedSourceId)

        if (sourceItems && sourceItems.length > 0) {
          const clonedItems = sourceItems.map(item => ({
            trip_id: newTrip.id,
            gear_item_id: item.gear_item_id,
            user_id: userId,
            quantity: item.quantity,
            wear_type: item.wear_type,
            override_weight_oz: item.override_weight_oz,
            included: item.included,
            notes: item.notes,
          }))

          const { error: itemsError } = await supabase
            .from('trip_items')
            .insert(clonedItems)

          if (itemsError) throw itemsError
        }
      }

      toast.success(`"${newTrip.name}" created`)
      router.push(`/trips/${newTrip.id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create trip')
      setSaving(false)
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-8 py-8 max-w-2xl mx-auto"
    >
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-8">
        New trip
      </h1>

      {/* Mode selection */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { mode: 'blank' as NewTripMode, icon: Plus, title: 'Blank trip', desc: 'Start from scratch' },
          {
            mode: 'template' as NewTripMode,
            icon: FileStack,
            title: 'From template',
            desc: `${templates.length} template${templates.length !== 1 ? 's' : ''}`,
          },
          {
            mode: 'duplicate' as NewTripMode,
            icon: Copy,
            title: 'Duplicate trip',
            desc: `${allTrips.length} trip${allTrips.length !== 1 ? 's' : ''}`,
          },
        ].map(({ mode: m, icon: Icon, title, desc }) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelectedSourceId('') }}
            className={cn(
              'flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all text-center',
              mode === m
                ? 'border-primary bg-accent text-accent-foreground'
                : 'border-border hover:border-border/80 hover:bg-secondary/50 text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <div>
              <p className={cn('text-sm font-medium', mode === m ? 'text-accent-foreground' : 'text-foreground')}>
                {title}
              </p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Source selector */}
      {mode === 'template' && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground block mb-2">Select template</label>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet. Save a trip as a template first.</p>
          ) : (
            <select
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === 'duplicate' && (
        <div className="mb-6">
          <label className="text-sm font-medium text-foreground block mb-2">Select trip to duplicate</label>
          {allTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trips yet.</p>
          ) : (
            <select
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a trip…</option>
              {allTrips.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Trip details form */}
      {mode && (
        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Trip name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. John Muir Trail 2025" maxLength={100}
              autoFocus
              autoCapitalize="words"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputCls}
              placeholder="Optional description" maxLength={300}
              autoCapitalize="sentences"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Trip date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Save as template toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsTemplate(p => !p)}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                isTemplate ? 'bg-primary' : 'bg-secondary border border-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                  isTemplate ? 'left-5' : 'left-1'
                )}
              />
            </div>
            <span className="text-sm font-medium text-foreground">Save as template</span>
          </label>

          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="mt-2 w-full btn-primary py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create trip
          </button>
        </div>
      )}
    </motion.div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow'
