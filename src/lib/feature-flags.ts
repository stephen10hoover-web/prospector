/**
 * Feature flag system — server-side only.
 *
 * Evaluation order:
 *   1. Per-user override (feature_flag_overrides table)
 *   2. Global flag value (feature_flags table)
 *   3. Default: false (fail-closed)
 *
 * 30-second in-process stale-while-revalidate cache for global flags.
 * Per-user overrides are not cached (low traffic, high precision needed).
 */

import { createAdminClient } from './supabase-server'

interface FlagCacheEntry {
  value: boolean
  at: number
}

const flagCache = new Map<string, FlagCacheEntry>()
const FLAG_TTL_MS = 30_000

export async function isFeatureEnabled(flagKey: string, userId?: string): Promise<boolean> {
  const admin = createAdminClient()

  // Check per-user override first (uncached — intentionally precise)
  if (userId) {
    const { data: override } = await admin
      .from('feature_flag_overrides')
      .select('enabled')
      .eq('flag_key', flagKey)
      .eq('user_id', userId)
      .single()

    if (override !== null) return override.enabled
  }

  // Check in-process cache for global flag
  const cached = flagCache.get(flagKey)
  if (cached && Date.now() - cached.at < FLAG_TTL_MS) {
    return cached.value
  }

  // Fetch global flag from DB
  const { data: flag } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', flagKey)
    .single()

  const enabled = flag?.enabled ?? false
  flagCache.set(flagKey, { value: enabled, at: Date.now() })
  return enabled
}

/** Invalidate a specific flag from the in-process cache (call after admin updates it). */
export function invalidateFlagCache(flagKey: string) {
  flagCache.delete(flagKey)
}

/** Invalidate all cached flags. */
export function invalidateAllFlagCache() {
  flagCache.clear()
}
