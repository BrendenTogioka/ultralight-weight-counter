'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Mountain, ArrowUpDown, Scale, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TripCard } from '@/components/trips/TripCard'
import type { Trip } from '@/types'
import { calculateWeightSummary } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import { pageVariants, staggerContainer, staggerItem } from '@/lib/motion'

type SortKey = 'updated_at' | 'trip_date' | 'name' | 'weight'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated_at', label: 'Recent' },
  { key: 'trip_date', label: 'Date' },
  { key: 'name', label: 'Name' },
  { key: 'weight', label: 'Weight' },
]

interface Props {
  trips: Trip[]
}

export function TripsClient({ trips }: Props) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 2) {
        next.add(id)
      }
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function handleCompare() {
    const [a, b] = [...selectedIds]
    router.push(`/trips/compare?a=${a}&b=${b}`)
  }

  const activeTrips = useMemo(() => trips.filter(t => !t.is_template), [trips])
  const templates = useMemo(() => trips.filter(t => t.is_template), [trips])

  function getWeight(trip: Trip) {
    return calculateWeightSummary((trip.trip_items ?? []) as any).base_oz
  }

  const sorted = useMemo(() => {
    return [...activeTrips].sort((a, b) => {
      // trip_date can be null — push nulls to the end regardless of sort direction
      if (sortKey === 'trip_date') {
        if (!a.trip_date && !b.trip_date) return 0
        if (!a.trip_date) return 1
        if (!b.trip_date) return -1
        return sortDir === 'asc'
          ? a.trip_date.localeCompare(b.trip_date)
          : b.trip_date.localeCompare(a.trip_date)
      }
      let vA: string | number = 0
      let vB: string | number = 0
      switch (sortKey) {
        case 'updated_at': vA = a.updated_at; vB = b.updated_at; break
        case 'name':       vA = a.name.toLowerCase(); vB = b.name.toLowerCase(); break
        case 'weight':     vA = getWeight(a); vB = getWeight(b); break
      }
      if (vA < vB) return sortDir === 'asc' ? -1 : 1
      if (vA > vB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [activeTrips, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : key === 'trip_date' ? 'desc' : 'desc')
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-8 py-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTrips.length} trip{activeTrips.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Compare entry point — only shown when 2+ trips exist and not in select mode */}
          {activeTrips.length >= 2 && !selectMode && (
            <button
              onClick={() => setSelectMode(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}
          {/* Cancel select mode */}
          {selectMode && (
            <button
              onClick={exitSelectMode}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          )}
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New trip</span>
          </Link>
        </div>
      </div>

      {/* Select-mode instruction banner */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-3 rounded-xl bg-accent border border-primary/20 text-sm text-accent-foreground flex items-center gap-2"
          >
            <Scale className="h-4 w-4 shrink-0 text-primary" />
            {selectedIds.size === 0
              ? 'Select two trips to compare'
              : selectedIds.size === 1
                ? 'Select one more trip'
                : 'Ready to compare'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active trips */}
      <section>
        {/* Sort chips */}
        {activeTrips.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    sortKey === key
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTrips.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center">
            <Mountain className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No trips yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Create your first trip to start tracking pack weight.
            </p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create a trip
            </Link>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {sorted.map(trip => (
              <motion.div key={trip.id} variants={staggerItem} className="h-full">
                <TripCard
                  trip={trip}
                  selectable={selectMode}
                  selected={selectedIds.has(trip.id)}
                  onSelect={toggleSelect}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Sticky compare action bar — fixed, so DOM position doesn't matter */}
      <AnimatePresence>
        {selectMode && selectedIds.size === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-2xl shadow-2xl px-5 py-3.5"
          >
            <Scale className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">2 trips selected</span>
            <button
              onClick={handleCompare}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Compare →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates */}
      {templates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Templates
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {templates.map(trip => (
              <motion.div key={trip.id} variants={staggerItem} className="h-full">
                <TripCard trip={trip} isTemplate />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </motion.div>
  )
}
