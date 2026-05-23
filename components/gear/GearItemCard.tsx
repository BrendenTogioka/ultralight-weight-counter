'use client'

import Image from 'next/image'
import type { GearItem } from '@/types'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'

interface Props {
  item: GearItem
  onClick: () => void
}

export function GearItemCard({ item, onClick }: Props) {
  const { unit } = useUnit()
  const weightOz = toOz(item.weight_oz, item.weight_unit)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl overflow-hidden card-hover group"
    >
      {/* Square image / emoji */}
      <div className="aspect-square bg-secondary flex items-center justify-center relative overflow-hidden">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <span className="text-4xl">{CATEGORY_ICONS[item.category] ?? '📦'}</span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {item.name}
        </p>
        {item.brand && (
          <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full truncate max-w-[60%]">
            {item.type ?? item.category}
          </span>
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {formatWeight(weightOz, unit, 1)}
          </span>
        </div>
      </div>
    </button>
  )
}
