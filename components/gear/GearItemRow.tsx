'use client'

import Image from 'next/image'
import type { GearItem } from '@/types'
import { formatWeight, toOz } from '@/lib/calculations'
import { CATEGORY_ICONS, cn } from '@/lib/utils'
import { useUnit } from '@/components/providers/UnitProvider'

interface Props {
  item: GearItem
  isLast: boolean
  onClick: () => void
}

export function GearItemRow({ item, isLast, onClick }: Props) {
  const { unit } = useUnit()
  const weightOz = toOz(item.weight_oz, item.weight_unit)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-secondary/30 transition-colors group',
        !isLast && 'border-b border-border'
      )}
    >
      {/* Image / icon */}
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary flex items-center justify-center shrink-0">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} width={32} height={32} className="object-cover w-full h-full" />
        ) : (
          <span className="text-base">{CATEGORY_ICONS[item.category] ?? '📦'}</span>
        )}
      </div>

      {/* Name + brand/category */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground truncate sm:hidden">
          {[item.brand, item.category].filter(Boolean).join(' · ')}
        </p>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{item.notes}</p>
        )}
      </div>

      {/* Brand — desktop only */}
      <span className="hidden sm:block text-sm text-muted-foreground w-28 truncate text-right">
        {item.brand ?? '—'}
      </span>

      {/* Category + type — desktop only */}
      <div className="hidden sm:block text-right w-28">
        <span className="text-sm text-muted-foreground">{item.category}</span>
        {item.type && (
          <p className="text-xs text-muted-foreground/70">{item.type}</p>
        )}
      </div>

      {/* Weight */}
      <span className="text-sm font-medium text-foreground w-16 sm:w-20 text-right tabular-nums">
        {formatWeight(weightOz, unit)}
      </span>
    </button>
  )
}
