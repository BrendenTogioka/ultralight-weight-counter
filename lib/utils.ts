import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GEAR_CATEGORIES = [
  'Pack',
  'Shelter',
  'Sleep',
  'Kitchen',
  'Clothing',
  'Water',
  'Electronics',
  'Safety',
  'Misc',
] as const

export type GearCategory = (typeof GEAR_CATEGORIES)[number]

export const CATEGORY_ICONS: Record<string, string> = {
  Pack: '🎒',
  Shelter: '⛺',
  Sleep: '😴',
  Kitchen: '🍳',
  Clothing: '👕',
  Water: '💧',
  Electronics: '🔋',
  Safety: '🩹',
  Misc: '📦',
}

export const WEAR_TYPE_LABELS: Record<string, string> = {
  base: 'Base',
  worn: 'Worn',
  consumable: 'Consumable',
}

export const WEAR_TYPE_COLORS: Record<string, string> = {
  base: 'bg-blue-500',
  worn: 'bg-purple-500',
  consumable: 'bg-amber-500',
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
