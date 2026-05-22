'use client'

import type { WeightSummary, WeightUnit } from '@/types'
import { formatWeightDisplay, getWeightBarSegments } from '@/lib/calculations'

interface Props {
  summary: WeightSummary
  unit: WeightUnit
}

export function WeightSummaryBar({ summary, unit }: Props) {
  const segments = getWeightBarSegments(summary)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      {/* Main numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <WeightStat
          label="Base weight"
          oz={summary.base_oz}
          unit={unit}
          color="bg-blue-500"
        />
        <WeightStat
          label="Worn weight"
          oz={summary.worn_oz}
          unit={unit}
          color="bg-purple-500"
        />
        <WeightStat
          label="Consumables"
          oz={summary.consumable_oz}
          unit={unit}
          color="bg-amber-500"
        />
        <WeightStat
          label="Total pack"
          oz={summary.total_oz}
          unit={unit}
          isTotal
        />
      </div>

      {/* Weight bar */}
      {summary.full_total_oz > 0 && (
        <div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden flex gap-px">
            {segments.base > 0 && (
              <div
                className="weight-bar-base h-full rounded-full transition-all duration-500"
                style={{ width: `${segments.base}%` }}
              />
            )}
            {segments.worn > 0 && (
              <div
                className="weight-bar-worn h-full rounded-full transition-all duration-500"
                style={{ width: `${segments.worn}%` }}
              />
            )}
            {segments.consumable > 0 && (
              <div
                className="weight-bar-consumable h-full rounded-full transition-all duration-500"
                style={{ width: `${segments.consumable}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-5 mt-2.5">
            <Legend color="weight-bar-base" label="Base" />
            <Legend color="weight-bar-worn" label="Worn" />
            <Legend color="weight-bar-consumable" label="Consumables" />
            <span className="ml-auto text-xs text-muted-foreground">
              {summary.item_count} items included
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function WeightStat({
  label, oz, unit, color,
}: {
  label: string; oz: number; unit: WeightUnit; color?: string; isTotal?: boolean
}) {
  const { primary, secondary } = formatWeightDisplay(oz, unit, 2)
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {color && <div className={`w-2 h-2 rounded-full ${color}`} />}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {primary}
      </p>
      {secondary && (
        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{secondary}</p>
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
