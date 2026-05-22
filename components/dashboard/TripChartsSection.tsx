'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
  ResponsiveContainer, Legend,
} from 'recharts'
import { motion } from 'framer-motion'
import { BarChart2, TrendingUp } from 'lucide-react'
import type { Trip } from '@/types'
import { calculateWeightSummary } from '@/lib/calculations'
import { useUnit } from '@/components/providers/UnitProvider'
import { cn } from '@/lib/utils'
import { fadeIn } from '@/lib/motion'

// ─── helpers ──────────────────────────────────────────────────────────────────

function ozToDisplay(oz: number, unit: 'oz' | 'g'): number {
  if (unit === 'g') return Math.round(oz * 28.3495)
  // display as lbs with 2 decimals
  return parseFloat((oz / 16).toFixed(2))
}

function unitLabel(unit: 'oz' | 'g'): string {
  return unit === 'g' ? 'g' : 'lb'
}

function tripLabel(trip: Trip): string {
  const name = trip.name.length > 14 ? trip.name.slice(0, 13) + '…' : trip.name
  if (!trip.trip_date) return name
  const d = new Date(trip.trip_date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CHART_MUTED = '#888'
const BAR_BASE = '#818cf8'
const BAR_WORN = '#60a5fa'
const BAR_CONSUMABLE = '#34d399'
const LINE_COLOR = '#818cf8'

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="tabular-nums">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

type TabKey = 'compare' | 'trend'

interface Props {
  trips: Trip[]
}

export function TripChartsSection({ trips }: Props) {
  const { unit } = useUnit()
  const [tab, setTab] = useState<TabKey>('compare')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Only non-template trips with at least one item
  const validTrips = useMemo(() =>
    trips
      .filter(t => !t.is_template && (t.trip_items?.length ?? 0) > 0)
      .sort((a, b) => {
        // Sort by trip_date when available, otherwise created_at
        const dA = a.trip_date ?? a.created_at
        const dB = b.trip_date ?? b.created_at
        return dA < dB ? -1 : 1
      }),
    [trips],
  )

  // ── Compare data: stacked bar per trip ─────────────────────────────────────
  const compareData = useMemo(() =>
    validTrips.map(t => {
      const s = calculateWeightSummary((t.trip_items ?? []) as any)
      const ul = unitLabel(unit)
      return {
        name: tripLabel(t),
        fullName: t.name,
        [`Base (${ul})`]: ozToDisplay(s.base_oz, unit),
        [`Worn (${ul})`]: ozToDisplay(s.worn_oz, unit),
        [`Consumable (${ul})`]: ozToDisplay(s.consumable_oz, unit),
      }
    }),
    [validTrips, unit],
  )

  // ── Trend data: line chart of base weight over time ────────────────────────
  const trendData = useMemo(() =>
    validTrips.map(t => {
      const s = calculateWeightSummary((t.trip_items ?? []) as any)
      const ul = unitLabel(unit)
      return {
        name: tripLabel(t),
        fullName: t.name,
        [`Base (${ul})`]: ozToDisplay(s.base_oz, unit),
        [`Total (${ul})`]: ozToDisplay(s.total_oz, unit),
      }
    }),
    [validTrips, unit],
  )

  // Don't render if < 2 trips (charts aren't useful with 1 data point)
  if (validTrips.length < 2) return null

  const ul = unitLabel(unit)
  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'compare', label: 'Comparison', Icon: BarChart2 },
    { key: 'trend', label: 'Weight trend', Icon: TrendingUp },
  ]

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="mt-10"
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Trip analytics
        </h2>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/60 rounded-lg p-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                tab === key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <div className="border border-border rounded-2xl p-5 bg-card">
        {!mounted ? (
          <div className="h-52 flex items-center justify-center">
            <div className="h-4 w-4 border-2 border-muted-foreground/40 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === 'compare' ? (
          // ── Stacked bar: base / worn / consumable per trip ───────────────
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Pack weight breakdown across all trips
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={compareData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_MUTED }} axisLine={false} tickLine={false} unit={` ${ul}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey={`Base (${ul})`} stackId="a" fill={BAR_BASE} radius={[0, 0, 0, 0]} />
                <Bar dataKey={`Worn (${ul})`} stackId="a" fill={BAR_WORN} />
                <Bar dataKey={`Consumable (${ul})`} stackId="a" fill={BAR_CONSUMABLE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          // ── Line chart: base + total weight over trips ───────────────────
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Base and total weight across trips (chronological)
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART_MUTED }} axisLine={false} tickLine={false} unit={` ${ul}`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line
                  type="monotone"
                  dataKey={`Base (${ul})`}
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey={`Total (${ul})`}
                  stroke={BAR_CONSUMABLE}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 4, fill: BAR_CONSUMABLE, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}
