import { z } from 'zod'
import { GEAR_CATEGORIES } from '@/lib/utils'

// ============================================================
// GEAR ITEM
// ============================================================

export const gearItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform(s => s.trim()),
  brand: z
    .string()
    .max(80, 'Brand must be 80 characters or less')
    .transform(s => s.trim())
    .optional(),
  category: z.enum([...GEAR_CATEGORIES] as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid category' }),
  }),
  type: z
    .string()
    .max(60, 'Type must be 60 characters or less')
    .transform(s => s.trim())
    .optional(),
  weight: z
    .number({ invalid_type_error: 'Weight must be a number' })
    .min(0, 'Weight cannot be negative')
    .max(10000, 'Weight seems too high — please check the unit'),
  weight_unit: z.enum(['oz', 'g']),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .transform(s => s.trim())
    .optional(),
})

export type GearItemSchema = z.infer<typeof gearItemSchema>

// ============================================================
// TRIP
// ============================================================

export const tripSchema = z.object({
  name: z
    .string()
    .min(1, 'Trip name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform(s => s.trim()),
  description: z
    .string()
    .max(300, 'Description must be 300 characters or less')
    .transform(s => s.trim())
    .optional(),
  trip_date: z.string().optional(),
  is_template: z.boolean().optional().default(false),
})

export type TripSchema = z.infer<typeof tripSchema>

// ============================================================
// IMAGE UPLOAD
// ============================================================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE_MB = 5

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Image must be a JPEG, PNG, WebP, or GIF'
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`
  }
  return null
}

// ============================================================
// PASSWORD
// ============================================================

export const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
