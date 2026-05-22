import type { TripItem, WeightSummary, CategoryWeight, WeightUnit } from '@/types'

// ============================================================
// UNIT CONVERSION
// ============================================================

export const OZ_TO_G = 28.3495

export function ozToG(oz: number): number {
  return oz * OZ_TO_G
}

export function gToOz(g: number): number {
  return g / OZ_TO_G
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === 'oz' ? ozToG(value) : gToOz(value)
}

/** Always stores in oz internally; converts for display */
export function toOz(value: number, unit: WeightUnit): number {
  return unit === 'oz' ? value : gToOz(value)
}

export function formatWeight(oz: number, unit: WeightUnit, decimals = 2): string {
  const value = unit === 'oz' ? oz : ozToG(oz)
  return `${value.toFixed(decimals)} ${unit}`
}

export function formatWeightShort(oz: number, unit: WeightUnit): string {
  const value = unit === 'oz' ? oz : ozToG(oz)
  if (value === 0) return `0 ${unit}`
  if (value < 0.1) return `<0.1 ${unit}`
  return `${value.toFixed(1)} ${unit}`
}

// Converts oz to lbs+oz string for display (e.g. "2 lb 3.4 oz")
export function formatLbsOz(oz: number): string {
  if (oz < 16) return `${oz.toFixed(1)} oz`
  const lbs = Math.floor(oz / 16)
  const remaining = oz % 16
  return remaining < 0.1 ? `${lbs} lb` : `${lbs} lb ${remaining.toFixed(1)} oz`
}

/** Returns a primary + optional secondary weight string.
 *  When unit='oz' and weight >= 16oz: primary = "2.24 lb", secondary = "35.8 oz"
 *  When unit='oz' and weight < 16oz: primary = "12.5 oz", secondary = null
 *  When unit='g': primary = "500 g", secondary = null
 */
export function formatWeightDisplay(
  oz: number,
  unit: WeightUnit,
  decimals = 2
): { primary: string; secondary: string | null } {
  if (unit === 'g') {
    return { primary: `${ozToG(oz).toFixed(0)} g`, secondary: null }
  }
  if (oz >= 16) {
    return {
      primary: `${(oz / 16).toFixed(decimals)} lb`,
      secondary: `${oz.toFixed(1)} oz`,
    }
  }
  return { primary: `${oz.toFixed(1)} oz`, secondary: null }
}

// ============================================================
// TRIP WEIGHT CALCULATIONS
// ============================================================

export function getEffectiveWeightOz(item: TripItem): number {
  if (item.override_weight_oz !== null && item.override_weight_oz !== undefined) {
    return item.override_weight_oz
  }
  if (!item.gear_item) return 0
  return toOz(item.gear_item.weight_oz, item.gear_item.weight_unit)
}

export function calculateWeightSummary(items: TripItem[]): WeightSummary {
  const included = items.filter(i => i.included)

  let base_oz = 0
  let worn_oz = 0
  let consumable_oz = 0

  for (const item of included) {
    const weight = getEffectiveWeightOz(item) * item.quantity
    if (item.wear_type === 'base') base_oz += weight
    else if (item.wear_type === 'worn') worn_oz += weight
    else if (item.wear_type === 'consumable') consumable_oz += weight
  }

  return {
    base_oz,
    worn_oz,
    consumable_oz,
    total_oz: base_oz + consumable_oz,
    full_total_oz: base_oz + consumable_oz + worn_oz,
    item_count: included.length,
  }
}

export function calculateCategoryWeights(items: TripItem[]): CategoryWeight[] {
  const map = new Map<string, CategoryWeight>()

  for (const item of items) {
    if (!item.gear_item) continue
    const cat = item.gear_item.category
    if (!map.has(cat)) {
      map.set(cat, { category: cat, weight_oz: 0, item_count: 0, items: [] })
    }
    const entry = map.get(cat)!
    entry.items.push(item)
    if (item.included) {
      entry.weight_oz += getEffectiveWeightOz(item) * item.quantity
      entry.item_count++
    }
  }

  // Within each category, sort items by sort_order then by created_at
  for (const entry of map.values()) {
    entry.items.sort((a, b) => {
      const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      if (orderDiff !== 0) return orderDiff
      return a.created_at < b.created_at ? -1 : 1
    })
  }

  return Array.from(map.values()).sort((a, b) => b.weight_oz - a.weight_oz)
}

// ============================================================
// WEIGHT BAR PERCENTAGES
// ============================================================

export function getWeightBarSegments(summary: WeightSummary) {
  const total = summary.full_total_oz || 1
  return {
    base: (summary.base_oz / total) * 100,
    worn: (summary.worn_oz / total) * 100,
    consumable: (summary.consumable_oz / total) * 100,
  }
}
