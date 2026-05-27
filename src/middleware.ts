import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding window rate limiter (resets on cold start — good enough for basic protection)
const ipCounters = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/search':              { max: 5,  windowMs: 60_000 },   // 5 searches/min
  '/api/leads':               { max: 60, windowMs: 60_000 },   // 60 reads/min
  '/api/auth':                { max: 10, windowMs: 60_000 },   // 10 auth attempts/min
  '/api/unsubscribe':         { max: 10, windowMs: 60_000 },
  default:                    { max: 120, windowMs: 60_000 },  // 120 req/min general
}

const BLOCKED_UA_PATTERNS = [
  /python-requests/i,
  /go-http-client/i,
  /libwww-perl/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /zgrab/i,
  /masscan/i,
  /nmap/i,
]

function getLimit(pathname: string) {
  for (const [prefix, limit] of Object.entries(RATE_LIMITS)) {
    if (prefix !== 'default' && pathname.startsWith(prefix)) return limit
  }
  return RATE_LIMITS.default
}

function checkRateLimit(ip: string, pathname: string): boolean {
  const { max, windowMs } = getLimit(pathname)
  const key = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`
  const now = Date.now()
  const entry = ipCounters.get(key)

  if (!entry || now > entry.resetAt) {
    ipCounters.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Block known bad user agents on API routes
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua || BLOCKED_UA_PATTERNS.some((p) => p.test(ua))) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // IP-based rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  if (!checkRateLimit(ip, pathname)) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
