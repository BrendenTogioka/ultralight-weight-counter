'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import type { Trip, TripItem, WeightUnit } from '@/types'
import {
  calculateWeightSummary, getEffectiveWeightOz,
  formatWeight, formatWeightDisplay,
} from '@/lib/calculations'
import { CATEGORY_ICONS, GEAR_CATEGORIES, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'
import { pageVariants } from '@/lib/motion'

// ─── Brand colours ────────────────────────────────────────────────────────────
const COLOR_A = '#f06543'  // tomato — primary brand
const COLOR_B = '#5ba0c0'  // steel blue

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTripDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

/** Coloured Δ badge — green = B lighter, amber = B heavier */
function Delta({ oz, unit }: { oz: number; unit: WeightUnit }) {
  if (Math.abs(oz) < 0.05) return <span className="text-xs text-muted-foreground">—</span>
  const heavier = oz > 0
  return (
    <span className={cn('text-xs font-semibold tabular-nums', heavier ? 'text-amber-500' : 'text-emerald-500')}>
      {heavier ? '+' : ''}{formatWeight(oz, unit, 1)}
    </span>
  )
}

/** Custom recharts tooltip */
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name !== 'delta' && `${p.name}: `}
          <span className="font-semibold">{Number(p.value).toFixed(2)} lb</span>
        </p>
      ))}
    </div>
  )
}

/** Builds a category → { weight_oz, items } map from a flat TripItem list */
function buildCatMap(items: TripItem[]) {
  const map = new Map<string, { weight_oz: number; items: TripItem[] }>()
  for (const item of items) {
    if (!item.gear_item) continue
    const cat = item.gear_item.category
    if (!map.has(cat)) map.set(cat, { weight_oz: 0, items: [] })
    const entry = map.get(cat)!
    entry.items.push(item)
    if (item.included) entry.weight_oz += getEffectiveWeightOz(item) * item.quantity
  }
  return map
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { tripA: Trip; tripB: Trip }

export function TripCompareClient({ tripA, tripB }: Props) {
  const { unit } = useUnit()
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const itemsA = useMemo(() => (tripA.trip_items ?? []) as TripItem[], [tripA])
  const itemsB = useMemo(() => (tripB.trip_items ?? []) as TripItem[], [tripB])

  const summaryA = useMemo(() => calculateWeightSummary(itemsA), [itemsA])
  const summaryB = useMemo(() => calculateWeightSummary(itemsB), [itemsB])

  const catMapA = useMemo(() => buildCatMap(itemsA), [itemsA])
  const catMapB = useMemo(() => buildCatMap(itemsB), [itemsB])

  // All categories present in either trip, in canonical order
  const allCategories = useMemo(() => {
    const cats = new Set([...catMapA.keys(), ...catMapB.keys()])
    const known = (GEAR_CATEGORIES as readonly string[]).filter(c => cats.has(c))
    const unknown = [...cats].filter(c => !(GEAR_CATEGORIES as readonly string[]).includes(c))
    return [...known, ...unknown]
  }, [catMapA, catMapB])

  // Gear ID sets for overlap detection
  const idsA = useMemo(() => new Set(itemsA.map(i => i.gear_item_id)), [itemsA])
  const idsB = useMemo(() => new Set(itemsB.map(i => i.gear_item_id)), [itemsB])
  const shared = useMemo(() => new Set([...idsA].filter(id => idsB.has(id))), [idsA, idsB])
  const onlyA = useMemo(() => [...idsA].filter(id => !idsB.has(id)).length, [idsA, idsB])
  const onlyB = useMemo(() => [...idsB].filter(id => !idsA.has(id)).length, [idsA, idsB])

  // Chart data (always in lb for readability — consistent with existing charts)
  const groupedChartData = useMemo(() =>
    allCategories.map(cat => ({
      cat,
      [truncate(tripA.name, 14)]: parseFloat(((catMapA.get(cat)?.weight_oz ?? 0) / 16).toFixed(2)),
      [truncate(tripB.name, 14)]: parseFloat(((catMapB.get(cat)?.weight_oz ?? 0) / 16).toFixed(2)),
    })),
    [allCategories, catMapA, catMapB, tripA.name, tripB.name],
  )

  const deltaChartData = useMemo(() =>
    allCategories
      .map(cat => ({
        cat,
        delta: parseFloat((((catMapB.get(cat)?.weight_oz ?? 0) - (catMapA.get(cat)?.weight_oz ?? 0)) / 16).toFixed(2)),
      }))
      .filter(d => Math.abs(d.delta) > 0.01),
    [allCategories, catMapA, catMapB],
  )

  const nameA = truncate(tripA.name, 14)
  const nameB = truncate(tripB.name, 14)

  const dateA = tripA.trip_date
    ? tripA.trip_date_end && tripA.trip_date_end !== tripA.trip_date
      ? `${formatTripDate(tripA.trip_date)} – ${formatTripDate(tripA.trip_date_end)}`
      : formatTripDate(tripA.trip_date)
    : null
  const dateB = tripB.trip_date
    ? tripB.trip_date_end && tripB.trip_date_end !== tripB.trip_date
      ? `${formatTripDate(tripB.trip_date)} – ${formatTripDate(tripB.trip_date_end)}`
      : formatTripDate(tripB.trip_date)
    : null

  const summaryRows = [
    { label: 'Base weight',  ozA: summaryA.base_oz,        ozB: summaryB.base_oz },
    { label: 'Worn weight',  ozA: summaryA.worn_oz,        ozB: summaryB.worn_oz },
    { label: 'Consumables',  ozA: summaryA.consumable_oz,  ozB: summaryB.consumable_oz },
    { label: 'Total pack',   ozA: summaryA.total_oz,       ozB: summaryB.total_oz },
  ]

  function toggleCat(cat: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="px-4 sm:px-8 py-8 max-w-4xl mx-auto"
    >
      {/* Back */}
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All trips
      </Link>

      <h1 className="text-xl font-semibold text-foreground mb-6">Trip Comparison</h1>

      {/* ── Trip header cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {([
          { trip: tripA, color: COLOR_A, date: dateA },
          { trip: tripB, color: COLOR_B, date: dateB },
        ] as const).map(({ trip, color, date }) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="block border border-border rounded-xl p-4 hover:bg-secondary/30 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <p className="text-sm font-semibold text-foreground truncate">{trip.name}</p>
                </div>
                {date && <p className="text-xs text-muted-foreground pl-[18px]">{date}</p>}
                <p className="text-xs text-muted-foreground pl-[18px] mt-0.5">
                  {(trip.trip_items ?? []).length} items
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Weight summary table ──
           Column widths are identical in the header and every data row so
           they stay locked together across all viewport sizes. */}
      <div className="border border-border rounded-xl overflow-hidden mb-8">
        {/* Header — same column widths as data rows */}
        <div className="flex items-center px-4 py-2.5 bg-secondary/30 border-b border-border">
          <span className="flex-1" />
          <div className="w-20 sm:w-28 shrink-0 text-right">
            <span className="text-xs font-semibold truncate block" style={{ color: COLOR_A }}>{nameA}</span>
          </div>
          <div className="w-14 sm:w-16 shrink-0 text-center">
            <span className="text-xs font-medium text-muted-foreground">Δ</span>
          </div>
          <div className="w-20 sm:w-28 shrink-0 text-right">
            <span className="text-xs font-semibold truncate block" style={{ color: COLOR_B }}>{nameB}</span>
          </div>
        </div>

        {summaryRows.map(({ label, ozA, ozB }, idx) => {
          const isTotal = idx === summaryRows.length - 1
          const { primary: pA, secondary: sA } = formatWeightDisplay(ozA, unit, 1)
          const { primary: pB, secondary: sB } = formatWeightDisplay(ozB, unit, 1)
          return (
            <div
              key={label}
              className={cn(
                'flex items-center px-4 py-3',
                idx < summaryRows.length - 1 && 'border-b border-border',
                isTotal && 'bg-secondary/20',
              )}
            >
              <span className={cn(
                'flex-1 min-w-0 text-sm',
                isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}>
                {label}
              </span>
              <div className="w-20 sm:w-28 shrink-0 text-right">
                <span className={cn('text-sm tabular-nums', isTotal && 'font-semibold')}>{pA}</span>
                {sA && <p className="text-xs text-muted-foreground tabular-nums leading-tight">{sA}</p>}
              </div>
              <div className="w-14 sm:w-16 shrink-0 text-center">
                <Delta oz={ozB - ozA} unit={unit} />
              </div>
              <div className="w-20 sm:w-28 shrink-0 text-right">
                <span className={cn('text-sm tabular-nums', isTotal && 'font-semibold')}>{pB}</span>
                {sB && <p className="text-xs text-muted-foreground tabular-nums leading-tight">{sB}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Charts ── */}
      {allCategories.length > 0 && (
        <div className={cn('gap-4 mb-8', deltaChartData.length > 0 ? 'grid grid-cols-1 md:grid-cols-2' : 'block')}>

          {/* Grouped category bar chart */}
          <div className="border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Weight by Category
            </p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={groupedChartData}
                barSize={9}
                barGap={2}
                margin={{ left: -16, right: 4, top: 4, bottom: 0 }}
              >
                <XAxis
                  dataKey="cat"
                  tick={{ fontSize: 10, fill: '#888' }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={52}
                />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} unit=" lb" />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey={nameA} fill={COLOR_A} radius={[3, 3, 0, 0]} />
                <Bar dataKey={nameB} fill={COLOR_B} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-5 mt-1">
              {[{ name: tripA.name, color: COLOR_A }, { name: tripB.name, color: COLOR_B }].map(({ name, color }) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delta diverging chart */}
          {deltaChartData.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Weight Difference
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                <span className="text-emerald-500 font-medium">▼ lighter</span>
                {' · '}
                <span className="text-amber-500 font-medium">▲ heavier</span>
                {' in '}
                <span className="font-medium text-foreground">{truncate(tripB.name, 16)}</span>
              </p>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={deltaChartData}
                  barSize={12}
                  margin={{ left: -16, right: 4, top: 4, bottom: 0 }}
                >
                  <XAxis
                    dataKey="cat"
                    tick={{ fontSize: 10, fill: '#888' }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} unit=" lb" />
                  <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const val = Number(payload[0].value)
                      return (
                        <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
                          <p className="font-medium text-foreground mb-1">{label}</p>
                          <p style={{ color: val > 0 ? '#f59e0b' : '#10b981' }}>
                            {val > 0 ? '+' : ''}{val.toFixed(2)} lb ({val > 0 ? 'heavier' : 'lighter'})
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="delta" radius={[3, 3, 0, 0]}>
                    {deltaChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.delta > 0 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Category breakdown ── */}
      <div className="border border-border rounded-xl overflow-hidden mb-6">
        {/* Header — identical column widths to the data rows below */}
        <div className="flex items-center px-4 py-2.5 bg-secondary/30 border-b border-border">
          <span className="flex-1 min-w-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category
          </span>
          <div className="w-20 sm:w-24 shrink-0 text-right">
            <span className="text-xs font-semibold truncate block" style={{ color: COLOR_A }}>{nameA}</span>
          </div>
          <div className="w-14 sm:w-16 shrink-0 text-center">
            <span className="text-xs font-medium text-muted-foreground">Δ</span>
          </div>
          <div className="w-20 sm:w-24 shrink-0 text-right">
            <span className="text-xs font-semibold truncate block" style={{ color: COLOR_B }}>{nameB}</span>
          </div>
          <div className="w-8 shrink-0" />
        </div>

        {allCategories.map((cat, idx) => {
          const wA = catMapA.get(cat)?.weight_oz ?? 0
          const wB = catMapB.get(cat)?.weight_oz ?? 0
          const catItemsA = catMapA.get(cat)?.items ?? []
          const catItemsB = catMapB.get(cat)?.items ?? []
          const expanded = expandedCats.has(cat)
          const isLast = idx === allCategories.length - 1

          return (
            <div key={cat} className={cn(!isLast && 'border-b border-border')}>
              {/* Category summary row — same column widths as header */}
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
              >
                <span className="flex-1 min-w-0 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="text-base shrink-0">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                  <span className="truncate">{cat}</span>
                  <span className="text-xs text-muted-foreground font-normal shrink-0 hidden sm:inline">
                    ({catItemsA.length}/{catItemsB.length})
                  </span>
                </span>
                <div className="w-20 sm:w-24 shrink-0 text-right">
                  <span className="text-sm tabular-nums">{formatWeightDisplay(wA, unit, 1).primary}</span>
                </div>
                <div className="w-14 sm:w-16 shrink-0 text-center">
                  <Delta oz={wB - wA} unit={unit} />
                </div>
                <div className="w-20 sm:w-24 shrink-0 text-right">
                  <span className="text-sm tabular-nums">{formatWeightDisplay(wB, unit, 1).primary}</span>
                </div>
                <div className="w-8 shrink-0 flex items-center justify-center text-muted-foreground">
                  {expanded
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded items */}
              {expanded && (
                <div className="border-t border-border bg-secondary/10 px-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: tripA.name, color: COLOR_A, items: catItemsA },
                      { name: tripB.name, color: COLOR_B, items: catItemsB },
                    ].map(({ name, color, items: catItems }) => (
                      <div key={name}>
                        <p className="text-xs font-semibold mb-2 truncate" style={{ color }}>{name}</p>
                        {catItems.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No items</p>
                        ) : (
                          catItems.map(item => (
                            <div
                              key={item.id}
                              className={cn(
                                'flex items-center justify-between py-1.5 px-2.5 rounded-lg mb-1 text-xs gap-2',
                                shared.has(item.gear_item_id)
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'bg-secondary/30',
                              )}
                            >
                              <span className="text-foreground truncate">{item.gear_item?.name}</span>
                              <span className="text-muted-foreground tabular-nums shrink-0">
                                {formatWeight(getEffectiveWeightOz(item) * item.quantity, unit, 1)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                  {shared.size > 0 && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary/10 border border-primary/20" />
                      Items in both trips
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Gear overlap summary ── */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{shared.size}</span>
          {' '}item{shared.size !== 1 ? 's' : ''} in common
        </span>
        {onlyA > 0 && (
          <span>
            · <span className="font-semibold" style={{ color: COLOR_A }}>{onlyA}</span>
            {' '}only in {truncate(tripA.name, 20)}
          </span>
        )}
        {onlyB > 0 && (
          <span>
            · <span className="font-semibold" style={{ color: COLOR_B }}>{onlyB}</span>
            {' '}only in {truncate(tripB.name, 20)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
