'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Mountain, ArrowUpDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { TripCard } from '@/components/trips/TripCard'
import type { Trip } from '@/types'
import { calculateWeightSummary } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import { pageVariants, staggerContainer, staggerItem } from '@/lib/motion'

type SortKey = 'updated_at' | 'created_at' | 'name' | 'weight'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated_at', label: 'Recent' },
  { key: 'created_at', label: 'Created' },
  { key: 'name', label: 'Name' },
  { key: 'weight', label: 'Weight' },
]

interface Props {
  trips: Trip[]
}

export function TripsClient({ trips }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const activeTrips = useMemo(() => trips.filter(t => !t.is_template), [trips])
  const templates = useMemo(() => trips.filter(t => t.is_template), [trips])

  function getWeight(trip: Trip) {
    return calculateWeightSummary((trip.trip_items ?? []) as any).base_oz
  }

  const sorted = useMemo(() => {
    return [...activeTrips].sort((a, b) => {
      let vA: string | number = 0
      let vB: string | number = 0
      switch (sortKey) {
        case 'updated_at': vA = a.updated_at; vB = b.updated_at; break
        case 'created_at': vA = a.created_at; vB = b.created_at; break
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
      setSortDir(key === 'name' ? 'asc' : 'desc')
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
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New trip</span>
        </Link>
      </div>

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
                <TripCard trip={trip} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

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
