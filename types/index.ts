// ============================================================
// DATABASE TYPES
// ============================================================

export type WeightUnit = 'oz' | 'g'
export type WearType = 'base' | 'worn' | 'consumable'

export interface UserSettings {
  id: string
  user_id: string
  default_unit: WeightUnit
  created_at: string
  updated_at: string
}

export interface GearCategory {
  id: number
  name: string
}

export interface GearType {
  id: string
  user_id: string | null
  name: string
  created_at: string
}

export interface GearItem {
  id: string
  user_id: string
  name: string
  brand: string | null
  category: string
  type: string | null
  weight_oz: number
  weight_unit: WeightUnit
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  description: string | null
  trip_date: string | null
  trip_date_end: string | null
  is_template: boolean
  is_public: boolean
  cloned_from_id: string | null
  featured_image_url: string | null
  created_at: string
  updated_at: string
  // joined
  trip_items?: TripItem[]
}

export interface Kit {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  // joined
  kit_items?: KitItem[]
}

export interface KitItem {
  id: string
  kit_id: string
  gear_item_id: string
  quantity: number
  wear_type: WearType
  sort_order: number
  created_at: string
  // joined
  gear_item?: GearItem
}

export interface Checklist {
  id: string
  user_id: string
  trip_id: string | null
  name: string
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  checklist_items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  name: string
  brand: string | null
  sort_order: number
  checked: boolean
  created_at: string
}

export interface TripItem {
  id: string
  trip_id: string
  gear_item_id: string
  user_id: string
  quantity: number
  wear_type: WearType
  override_weight_oz: number | null
  included: boolean
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // joined
  gear_item?: GearItem
}

// ============================================================
// FORM TYPES
// ============================================================

export interface GearItemFormData {
  name: string
  brand: string
  category: string
  type: string
  weight: number
  weight_unit: WeightUnit
  notes: string
}

export interface TripFormData {
  name: string
  description: string
  trip_date: string
  is_template: boolean
}

export interface TripItemFormData {
  gear_item_id: string
  quantity: number
  wear_type: WearType
  override_weight_oz?: number
  notes: string
}

// ============================================================
// WEIGHT CALCULATION TYPES
// ============================================================

export interface WeightSummary {
  base_oz: number
  worn_oz: number
  consumable_oz: number
  total_oz: number       // base + consumable
  full_total_oz: number  // base + consumable + worn
  item_count: number
}

export interface CategoryWeight {
  category: string
  weight_oz: number
  item_count: number
  items: TripItem[]
}

// ============================================================
// UI TYPES
// ============================================================

export type SortField = 'weight' | 'name' | 'brand' | 'category' | 'created_at'
export type SortDirection = 'asc' | 'desc'

export interface LibraryFilters {
  search: string
  category: string
  type: string
  brand: string
  sortField: SortField
  sortDirection: SortDirection
}

export type NewTripMode = 'blank' | 'template' | 'duplicate'
