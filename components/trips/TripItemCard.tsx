'use client'

import type { TripItem, WeightUnit } from '@/types'
import { formatWeight, getEffectiveWeightOz } from '@/lib/calculations'
import { CATEGORY_ICONS, cn } from '@/lib/utils'

interface Props {
  item: TripItem
  unit: WeightUnit
  onClick: () => void
}

const WEAR_COLORS: Record<string, string> = {
  base: 'bg-primary/10 text-primary',
  worn: 'bg-[#9952e0]/10 text-[#9952e0]',
  consumable: 'bg-[#f09d51]/15 text-[#f09d51]',
}

export function TripItemCard({ item, unit, onClick }: Props) {
  const gear = item.gear_item!
  const effectiveOz = getEffectiveWeightOz(item)
  const totalOz = effectiveOz * item.quantity

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-card border border-border rounded-xl overflow-hidden card-hover group transition-opacity',
        !item.included && 'opacity-50'
      )}
    >
      {/* Square image / emoji */}
      <div className="aspect-square bg-secondary flex items-center justify-center relative overflow-hidden">
        {gear.image_url ? (
          <img
            src={gear.image_url}
            alt={gear.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-3xl">{CATEGORY_ICONS[gear.category] ?? '📦'}</span>
        )}
        {item.quantity > 1 && (
          <span className="absolute top-1.5 right-1.5 text-xs font-semibold bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            ×{item.quantity}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground truncate leading-snug group-hover:text-primary transition-colors">
          {gear.name}
        </p>
        {gear.brand && (
          <p className="text-xs text-muted-foreground truncate">{gear.brand}</p>
        )}
        <div className="flex items-center justify-between mt-1.5 gap-1">
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full capitalize font-medium', WEAR_COLORS[item.wear_type])}>
            {item.wear_type}
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
            {formatWeight(totalOz, unit, 1)}
          </span>
        </div>
      </div>
    </button>
  )
}
