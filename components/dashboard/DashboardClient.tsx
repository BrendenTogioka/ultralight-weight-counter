'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Mountain, ArrowRight, Package } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { TripCard } from '@/components/trips/TripCard'
import type { Trip, GearType } from '@/types'
import { pageVariants, staggerContainer, staggerItem } from '@/lib/motion'

const TripChartsSection = dynamic(
  () => import('@/components/dashboard/TripChartsSection').then(m => ({ default: m.TripChartsSection })),
  { ssr: false },
)
const AddEditGearModal = dynamic(() =>
  import('@/components/gear/AddEditGearModal').then(m => ({ default: m.AddEditGearModal }))
)

const RECENT_LIMIT = 6

interface Props {
  trips: Trip[]
  userId: string
  gearTypes: GearType[]
}

export function DashboardClient({ trips, userId, gearTypes }: Props) {
  const [showAddGear, setShowAddGear] = useState(false)
  const activTrips = useMemo(() => trips.filter(t => !t.is_template), [trips])
  const templates = useMemo(() => trips.filter(t => t.is_template), [trips])

  // Most recent first (server already orders by updated_at desc, just slice)
  const recentTrips = useMemo(() => activTrips.slice(0, RECENT_LIMIT), [activTrips])
  const hasMore = activTrips.length > RECENT_LIMIT

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
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activTrips.length} trip{activTrips.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddGear(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors text-foreground"
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Add gear</span>
          </button>
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New trip</span>
          </Link>
        </div>
      </div>

      {/* Analytics charts (only shown when 2+ trips exist) */}
      <TripChartsSection trips={trips} />

      {/* Recent trips */}
      <section className="mt-8 md:mt-10">
        {activTrips.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Recent trips
            </h2>
            {hasMore && (
              <Link
                href="/trips"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {activTrips.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center">
            <Mountain className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No trips yet</p>
            <p className="text-sm text-muted-foreground mb-5">Create your first trip to start tracking pack weight.</p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create a trip
            </Link>
          </div>
        ) : (
          <>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {recentTrips.map(trip => (
                <motion.div key={trip.id} variants={staggerItem} className="h-full">
                  <TripCard trip={trip} />
                </motion.div>
              ))}
            </motion.div>

            {hasMore && (
              <div className="mt-4 text-center">
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  View all {activTrips.length} trips
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
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

      {/* Add Gear modal */}
      {showAddGear && (
        <AddEditGearModal
          item={null}
          gearTypes={gearTypes}
          userId={userId}
          onClose={() => setShowAddGear(false)}
          onSaved={() => setShowAddGear(false)}
        />
      )}
    </motion.div>
  )
}
