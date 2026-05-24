'use client'

import Link from 'next/link'
import { Calendar, Package, Mountain, Check } from 'lucide-react'
import type { Trip } from '@/types'
import { calculateWeightSummary, formatWeightDisplay, getWeightBarSegments } from '@/lib/calculations'
import { formatDate, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'

interface TripCardProps {
  trip: Trip
  isTemplate?: boolean
  /** When true, clicking the card calls onSelect instead of navigating */
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string) => void
}

export function TripCard({ trip, isTemplate, selectable, selected, onSelect }: TripCardProps) {
  const { unit } = useUnit()
  const items = trip.trip_items ?? []
  const summary = calculateWeightSummary(items as any)
  const segments = getWeightBarSegments(summary)

  const inner = (
    <>
      {/* 16:9 featured image / placeholder */}
      <div className="relative aspect-video w-full overflow-hidden bg-secondary shrink-0">
        {trip.featured_image_url ? (
          <img
            src={trip.featured_image_url}
            alt={trip.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/80 to-secondary/40">
            <Mountain className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
        {isTemplate && (
          <span className="absolute top-2 left-2 text-xs bg-accent/90 backdrop-blur-sm text-accent-foreground px-2 py-0.5 rounded-full font-medium">
            Template
          </span>
        )}
        {/* Selection checkbox overlay */}
        {selectable && (
          <div className="absolute top-2.5 right-2.5">
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-all shadow-sm',
              selected
                ? 'bg-primary border-primary'
                : 'bg-black/25 border-white/70 backdrop-blur-sm',
            )}>
              {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {trip.name}
          </h3>
          {/* Always reserve one line for description so cards align */}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 min-h-[1rem]">
            {trip.description ?? ''}
          </p>
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

        {/* Weight summary — pushed to bottom */}
        <div className="mt-auto">
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
            <div className="weight-bar-base h-full transition-all" style={{ width: `${segments.base}%` }} />
            <div className="weight-bar-worn h-full transition-all" style={{ width: `${segments.worn}%` }} />
            <div className="weight-bar-consumable h-full transition-all" style={{ width: `${segments.consumable}%` }} />
          </div>

          {/* Mini legend */}
          {summary.full_total_oz > 0 && (
            <div className="flex items-center gap-3 mt-2">
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
        </div>
      </div>
    </>
  )

  if (selectable) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(trip.id)}
        onKeyDown={e => e.key === 'Enter' && onSelect?.(trip.id)}
        className={cn(
          'flex flex-col h-full bg-card border rounded-2xl overflow-hidden cursor-pointer transition-all',
          selected
            ? 'border-primary ring-2 ring-primary/25 shadow-sm'
            : 'border-border hover:border-primary/40',
        )}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden card-hover group"
    >
      {inner}
    </Link>
  )
}
