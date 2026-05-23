'use client'

import Link from 'next/link'
import { Calendar, Package } from 'lucide-react'
import type { Trip } from '@/types'
import { calculateWeightSummary, formatWeight, formatWeightDisplay, getWeightBarSegments } from '@/lib/calculations'
import { formatDate, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'

export function TripCard({ trip, isTemplate }: { trip: Trip; isTemplate?: boolean }) {
  const { unit } = useUnit()
  const items = trip.trip_items ?? []
  const summary = calculateWeightSummary(items as any)
  const segments = getWeightBarSegments(summary)

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="flex flex-col h-full bg-card border border-border rounded-2xl p-5 card-hover group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {isTemplate && (
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                Template
              </span>
            )}
          </div>
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {trip.name}
          </h3>
          {/* Always reserve one line for description so cards align */}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 min-h-[1rem]">
            {trip.description ?? ''}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          {items.length} items
        </div>
        {trip.trip_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(trip.trip_date)}
          </div>
        )}
      </div>

      {/* Weight summary */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-muted-foreground">Base weight</span>
          <div className="text-right">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {formatWeightDisplay(summary.base_oz, unit, 2).primary}
            </span>
            {formatWeightDisplay(summary.base_oz, unit, 2).secondary && (
              <p className="text-xs text-muted-foreground tabular-nums leading-tight">
                {formatWeightDisplay(summary.base_oz, unit, 2).secondary}
              </p>
            )}
          </div>
        </div>

        {/* Weight bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex">
          <div
            className="weight-bar-base h-full transition-all"
            style={{ width: `${segments.base}%` }}
          />
          <div
            className="weight-bar-worn h-full transition-all"
            style={{ width: `${segments.worn}%` }}
          />
          <div
            className="weight-bar-consumable h-full transition-all"
            style={{ width: `${segments.consumable}%` }}
          />
        </div>
      </div>

      {/* Mini legend */}
      {summary.full_total_oz > 0 && (
        <div className="flex items-center gap-3">
          {summary.worn_oz > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full weight-bar-worn" />
              <span className="text-xs text-muted-foreground">{formatWeightDisplay(summary.worn_oz, unit, 1).primary} worn</span>
            </div>
          )}
          {summary.consumable_oz > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full weight-bar-consumable" />
              <span className="text-xs text-muted-foreground">{formatWeightDisplay(summary.consumable_oz, unit, 1).primary} consumable</span>
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
