'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { TripItem, WeightUnit } from '@/types'
import {
  calculateCategoryWeights, getEffectiveWeightOz, formatWeight, formatWeightDisplay,
} from '@/lib/calculations'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { fadeIn } from '@/lib/motion'

// ─── Color palettes ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Pack: '#818cf8',
  Shelter: '#a78bfa',
  Sleep: '#60a5fa',
  Kitchen: '#fbbf24',
  Clothing: '#34d399',
  Water: '#22d3ee',
  Electronics: '#fb923c',
  Safety: '#f87171',
  Misc: '#94a3b8',
}
const COLOR_FALLBACKS = [
  '#818cf8', '#a78bfa', '#60a5fa', '#fbbf24',
  '#34d399', '#22d3ee', '#fb923c', '#f87171', '#94a3b8',
]
function catColor(name: string, idx: number) {
  return CATEGORY_COLORS[name] ?? COLOR_FALLBACKS[idx % COLOR_FALLBACKS.length]
}

const CHART_MUTED = '#888'

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name !== 'value' && p.name !== 'base' && p.name !== 'average' ? `${p.name}: ` : ''}
          <span className="font-semibold">{p.value.toFixed(2)} lb</span>
        </p>
      ))}
    </div>
  )
}

// ─── Gauge (UL Rating) ────────────────────────────────────────────────────────

const GCX = 110, GCY = 108, GR = 82, GW = 18

function gaugePoint(pct: number, r = GR) {
  const angle = Math.PI * (1 - pct)  // 0%=left(π), 100%=right(0)
  return { x: GCX + r * Math.cos(angle), y: GCY - r * Math.sin(angle) }
}

const GP0 = gaugePoint(0)        // left  = 0 lb
const GP1 = gaugePoint(1 / 3)   // 10 lb boundary
const GP2 = gaugePoint(2 / 3)   // 20 lb boundary
const GP3 = gaugePoint(1)        // right = 30 lb

function arc(from: typeof GP0, to: typeof GP0, r = GR, large = 0) {
  return `M ${from.x.toFixed(2)},${from.y.toFixed(2)} A ${r},${r} 0 ${large},0 ${to.x.toFixed(2)},${to.y.toFixed(2)}`
}

function ULGauge({ baseOz, unit }: { baseOz: number; unit: WeightUnit }) {
  const lbs = baseOz / 16
  const pct = Math.min(lbs / 30, 1)
  const needleTip = gaugePoint(pct, GR - 8)
  const needleHub = gaugePoint(pct, 20)

  const label =
    lbs < 10 ? 'Ultralight'
    : lbs < 20 ? 'Lightweight'
    : lbs < 30 ? 'Traditional'
    : 'Heavy'

  const labelColor =
    lbs < 10 ? '#22c55e'
    : lbs < 20 ? '#f59e0b'
    : '#ef4444'

  const { primary } = formatWeightDisplay(baseOz, unit, 1)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 220 130" className="w-full max-w-[260px]">
        {/* Track */}
        <path
          d={arc(GP0, GP3, GR, 1)}
          fill="none"
          stroke="currentColor"
          strokeWidth={GW}
          strokeOpacity={0.1}
          strokeLinecap="round"
          className="text-foreground"
        />
        {/* Green zone (< 10 lb) */}
        <path d={arc(GP0, GP1)} fill="none" stroke="#22c55e" strokeWidth={GW} strokeLinecap="round" />
        {/* Amber zone (10–20 lb) */}
        <path d={arc(GP1, GP2)} fill="none" stroke="#f59e0b" strokeWidth={GW} strokeLinecap="round" />
        {/* Red zone (> 20 lb) */}
        <path d={arc(GP2, GP3)} fill="none" stroke="#ef4444" strokeWidth={GW} strokeLinecap="round" />

        {/* Needle */}
        <motion.line
          x1={needleHub.x}
          y1={needleHub.y}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="text-foreground"
          initial={{ x1: GCX, y1: GCY, x2: GCX, y2: GCY - GR + 12 }}
          animate={{ x1: needleHub.x, y1: needleHub.y, x2: needleTip.x, y2: needleTip.y }}
          transition={{ type: 'spring', damping: 18, stiffness: 100, delay: 0.1 }}
        />
        <circle cx={GCX} cy={GCY} r={5} className="fill-foreground" />

        {/* Zone labels */}
        <text x="26" y={GCY + 18} textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="600">UL</text>
        <text x={GCX} y="20" textAnchor="middle" fontSize="9" fill={CHART_MUTED}>10–20 lb</text>
        <text x="194" y={GCY + 18} textAnchor="middle" fontSize="9" fill="#ef4444" fontWeight="600">Heavy</text>
      </svg>

      {/* Central label */}
      <div className="text-center -mt-2">
        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{primary}</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: labelColor }}>{label}</p>
        <p className="text-xs text-muted-foreground mt-1">base weight</p>
      </div>

      {/* UL thresholds legend */}
      <div className="flex items-center gap-5 text-xs text-muted-foreground mt-1">
        <span><span className="text-green-500 font-medium">●</span> &lt; 10 lb ultralight</span>
        <span><span className="text-amber-500 font-medium">●</span> &lt; 20 lb lightweight</span>
        <span><span className="text-red-500 font-medium">●</span> 20+ lb traditional</span>
      </div>
    </div>
  )
}

// ─── Compare tab ──────────────────────────────────────────────────────────────

interface CompareRow { category: string; current: number; average: number }

function CompareTab({
  items, unit, userId, tripId,
}: { items: TripItem[]; unit: WeightUnit; userId: string; tripId: string }) {
  const [data, setData] = useState<CompareRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [tripCount, setTripCount] = useState(0)

  async function load() {
    if (data || loading) return
    setLoading(true)
    const supabase = createClient()
    const { data: otherTrips } = await supabase
      .from('trips')
      .select('id, trip_items(quantity, wear_type, override_weight_oz, included, gear_item:gear_items(weight_oz, weight_unit, category))')
      .eq('user_id', userId)
      .neq('id', tripId)
      .eq('is_template', false)

    const trips = otherTrips ?? []
    setTripCount(trips.length)

    // Average weight per category across other trips
    const totals: Record<string, number[]> = {}
    for (const trip of trips) {
      const catWeights = calculateCategoryWeights((trip.trip_items ?? []) as any)
      for (const { category, weight_oz } of catWeights) {
        if (!totals[category]) totals[category] = []
        totals[category].push(weight_oz)
      }
    }
    const avgByCat: Record<string, number> = {}
    for (const [cat, vals] of Object.entries(totals)) {
      avgByCat[cat] = vals.reduce((a, b) => a + b, 0) / vals.length
    }

    const current = calculateCategoryWeights(items)
    setData(current.map(({ category, weight_oz }) => ({
      category: category.length > 8 ? category.slice(0, 7) + '…' : category,
      current: +(weight_oz / 16).toFixed(2),
      average: +((avgByCat[category] ?? 0) / 16).toFixed(2),
    })))
    setLoading(false)
  }

  // Lazy-load when tab first becomes visible
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  if (tripCount === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Add more trips to compare your category weights.
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4 text-center">
        This trip vs. your average across {tripCount} other trip{tripCount !== 1 ? 's' : ''}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis type="number" tick={{ fontSize: 10, fill: CHART_MUTED }} tickFormatter={v => `${v}lb`} />
          <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: CHART_MUTED }} width={60} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="current" name="This trip" fill="#818cf8" radius={[0, 3, 3, 0]} barSize={9} />
          <Bar dataKey="average" name="Your avg" fill="#94a3b8" radius={[0, 3, 3, 0]} barSize={9} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 justify-center mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#818cf8' }} />This trip</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#94a3b8' }} />Your avg</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = 'breakdown' | 'items' | 'rating' | 'compare'

interface Props {
  items: TripItem[]
  unit: WeightUnit
  userId: string
  tripId: string
}

export function WeightCharts({ items, unit, userId, tripId }: Props) {
  const [tab, setTab] = useState<Tab>('breakdown')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const includedItems = useMemo(() => items.filter(i => i.included), [items])
  const categoryData = useMemo(() => {
    return calculateCategoryWeights(includedItems).map(({ category, weight_oz }, i) => ({
      name: category,
      value: +(weight_oz / 16).toFixed(3),
      color: catColor(category, i),
    }))
  }, [includedItems])

  const itemData = useMemo(() => {
    return [...includedItems]
      .map(item => ({
        name: (item.gear_item?.name ?? '').length > 22
          ? (item.gear_item?.name ?? '').slice(0, 21) + '…'
          : (item.gear_item?.name ?? ''),
        value: +(getEffectiveWeightOz(item) * item.quantity / 16).toFixed(3),
        category: item.gear_item?.category ?? '',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20)
  }, [includedItems])

  const baseOz = useMemo(
    () => includedItems.filter(i => i.wear_type === 'base').reduce((s, i) => s + getEffectiveWeightOz(i) * i.quantity, 0),
    [includedItems],
  )

  if (includedItems.length === 0) return null

  const TABS: { id: Tab; label: string }[] = [
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'items', label: 'By item' },
    { id: 'rating', label: 'UL rating' },
    { id: 'compare', label: 'Compare' },
  ]

  return (
    <motion.div
      {...fadeIn}
      className="bg-card border border-border rounded-2xl p-5 mt-4"
    >
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              tab === t.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Breakdown (donut) ── */}
      {tab === 'breakdown' && (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {mounted ? (
            <div className="shrink-0">
              <PieChart width={180} height={180}>
                <Pie
                  data={categoryData}
                  cx={90}
                  cy={90}
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={600}
                >
                  {categoryData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p className="text-muted-foreground">{d.value.toFixed(2)} lb</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </div>
          ) : <div className="w-[180px] h-[180px] rounded-full bg-secondary/40 animate-pulse shrink-0" />}

          <div className="flex flex-col gap-2 w-full">
            {categoryData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-sm text-foreground flex-1 min-w-0">{name}</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{value.toFixed(2)} lb</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── By item (waterfall) ── */}
      {tab === 'items' && (
        <div>
          {mounted ? (
            <ResponsiveContainer width="100%" height={Math.max(180, itemData.length * 34)}>
              <BarChart
                layout="vertical"
                data={itemData}
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: CHART_MUTED }} tickFormatter={v => `${v}lb`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: CHART_MUTED }}
                  width={130}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12} animationDuration={500}>
                  {itemData.map((entry, i) => (
                    <Cell key={i} fill={catColor(entry.category, i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 bg-secondary/30 rounded-xl animate-pulse" />}
          {itemData.length === 20 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Showing top 20 items by weight</p>
          )}
        </div>
      )}

      {/* ── UL Rating (gauge) ── */}
      {tab === 'rating' && (
        <ULGauge baseOz={baseOz} unit={unit} />
      )}

      {/* ── Compare ── */}
      {tab === 'compare' && (
        mounted
          ? <CompareTab items={includedItems} unit={unit} userId={userId} tripId={tripId} />
          : <div className="h-48 bg-secondary/30 rounded-xl animate-pulse" />
      )}
    </motion.div>
  )
}
