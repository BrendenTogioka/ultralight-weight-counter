import { cache } from 'react'
import { createClient } from './supabase/server'

/**
 * Cached getUser — deduplicates the Supabase auth call within a single
 * RSC render tree. Both the app layout and every page call this; React's
 * cache() ensures the network round-trip only happens once per request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
