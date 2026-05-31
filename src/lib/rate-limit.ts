/**
 * Distributed rate limiting via Upstash Redis.
 * Falls back to a per-process in-memory sliding window when Upstash is not
 * configured — still blocks bursts within a single instance, but won't
 * coordinate across multiple serverless instances. Configure Upstash for
 * full distributed protection in production.
 */

// ─── In-memory fallback ────────────────────────────────────────────────────

interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>()

// Prune expired entries periodically to prevent memory leaks
let lastPrune = Date.now()
function pruneIfNeeded() {
  const now = Date.now()
  if (now - lastPrune < 60_000) return
  lastPrune = now
  memStore.forEach((entry, key) => {
    if (now >= entry.resetAt) memStore.delete(key)
  })
}

function inMemoryCheck(key: string, limit: number, windowMs: number): boolean {
  pruneIfNeeded()
  const now = Date.now()
  const entry = memStore.get(key)
  if (!entry || now >= entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ─── Upstash Redis limiter (lazy-initialised) ──────────────────────────────

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> }
let ratelimit: { search: Limiter; auth: Limiter; general: Limiter } | null = null

async function getUpstashLimiter() {
  if (ratelimit) return ratelimit
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // In production this is a serious misconfiguration: each serverless instance
    // maintains its own counter, so distributed rate limiting is NOT enforced.
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[rate-limit] WARNING: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
        'Rate limiting is per-process only and will NOT protect against distributed attacks. ' +
        'Configure Upstash Redis immediately.'
      )
    }
    return null
  }
  const { Redis } = await import('@upstash/redis')
  const { Ratelimit } = await import('@upstash/ratelimit')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  ratelimit = {
    search:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,   '60 s'),  prefix: 'rl:search' }),
    auth:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '60 s'),  prefix: 'rl:auth' }),
    general: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '60 s'), prefix: 'rl:general' }),
  }
  return ratelimit
}

// ─── Per-route limits for the in-memory fallback ──────────────────────────

const MEM_LIMITS: Record<RouteType, { limit: number; windowMs: number }> = {
  auth:    { limit: 10,  windowMs: 60_000 },
  search:  { limit: 5,   windowMs: 60_000 },
  general: { limit: 120, windowMs: 60_000 },
}

// ─── Public API ────────────────────────────────────────────────────────────

type RouteType = 'search' | 'auth' | 'general'

function routeType(pathname: string): RouteType {
  if (pathname.startsWith('/api/search')) return 'search'
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/billing')
  ) return 'auth'
  return 'general'
}

export async function checkRateLimit(
  ip: string,
  pathname: string,
): Promise<{ allowed: boolean }> {
  const type = routeType(pathname)
  const upstash = await getUpstashLimiter()

  if (upstash) {
    const { success } = await upstash[type].limit(ip)
    return { allowed: success }
  }

  // In-memory fallback
  const { limit, windowMs } = MEM_LIMITS[type]
  const allowed = inMemoryCheck(`${type}:${ip}`, limit, windowMs)
  return { allowed }
}
