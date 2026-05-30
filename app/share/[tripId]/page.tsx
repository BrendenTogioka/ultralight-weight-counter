import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Trip, TripItem } from '@/types'
import {
  calculateWeightSummary, calculateCategoryWeights,
  formatWeight, formatPounds, formatGrams, getWeightBarSegments,
} from '@/lib/calculations'
import { CATEGORY_ICONS } from '@/lib/utils'

// Anon Supabase client — respects RLS, reads trips where is_public = true
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default async function ShareTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const supabase = anonClient()

  const { data: trip } = await supabase
    .from('trips')
    .select(`*, trip_items(*, gear_item:gear_items(*))`)
    .eq('id', tripId)
    .eq('is_public', true)
    .single()

  if (!trip) notFound()

  const items = ((trip as Trip).trip_items ?? []) as TripItem[]
  const summary = calculateWeightSummary(items)
  const categoryWeights = calculateCategoryWeights(items)
  const segments = getWeightBarSegments(summary)

  const dateLabel = trip.trip_date
    ? trip.trip_date_end && trip.trip_date_end !== trip.trip_date
      ? `${fmtDate(trip.trip_date)} – ${fmtDate(trip.trip_date_end)}`
      : fmtDate(trip.trip_date)
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Hero image */}
      {trip.featured_image_url && (
        <div className="w-full aspect-video max-h-72 overflow-hidden">
          <img
            src={trip.featured_image_url}
            alt={trip.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">{trip.name}</h1>
          {trip.description && (
            <p className="text-muted-foreground mt-1">{trip.description}</p>
          )}
          {dateLabel && (
            <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
          )}
        </div>

        {/* Weight summary */}
        {summary.full_total_oz > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Base weight', oz: summary.base_oz },
                { label: 'Worn', oz: summary.worn_oz },
                { label: 'Consumables', oz: summary.consumable_oz },
                { label: 'Total pack', oz: summary.total_oz },
              ].map(({ label, oz }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">{formatPounds(oz)}</p>
                  {oz > 0 && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatGrams(oz)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {/* Weight bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
              <div className="weight-bar-base h-full" style={{ width: `${segments.base}%` }} />
              <div className="weight-bar-worn h-full" style={{ width: `${segments.worn}%` }} />
              <div className="weight-bar-consumable h-full" style={{ width: `${segments.consumable}%` }} />
            </div>
          </div>
        )}

        {/* Gear by category */}
        <div className="flex flex-col gap-4">
          {categoryWeights.map(({ category, weight_oz, items: catItems }) => (
            <div key={category} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category] ?? '📦'}</span>
                  <span className="text-sm font-medium text-foreground">{category}</span>
                  <span className="text-xs text-muted-foreground">({catItems.length})</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatWeight(weight_oz, 'oz', 1)}
                </span>
              </div>
              {catItems.map((item, idx) => {
                const gear = item.gear_item!
                const oz = (item.override_weight_oz ?? gear.weight_oz) * item.quantity
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < catItems.length - 1 ? 'border-b border-border' : ''} ${!item.included ? 'opacity-40' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      {gear.image_url
                        ? <img src={gear.image_url} alt={gear.name} className="w-full h-full object-cover rounded-lg" />
                        : <span className="text-sm">{CATEGORY_ICONS[gear.category] ?? '📦'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{gear.name}</p>
                      {gear.brand && <p className="text-xs text-muted-foreground">{gear.brand}</p>}
                    </div>
                    {item.quantity > 1 && (
                      <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                    )}
                    <span className="text-sm font-medium tabular-nums shrink-0">
                      {formatWeight(oz, 'oz', 1)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Build and track your own ultralight pack
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 btn-primary px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Try Ultralight — it&apos;s free
          </Link>
        </div>
      </div>
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
