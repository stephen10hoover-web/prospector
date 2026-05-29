import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':           'DENY',
  'X-Content-Type-Options':    'nosniff',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory sliding window — resets on cold start)
// ---------------------------------------------------------------------------
const ipCounters = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/internal':   { max: 60,  windowMs: 60_000 },  // admin API — lower ceiling
  '/api/search':     { max: 5,   windowMs: 60_000 },
  '/api/leads':      { max: 60,  windowMs: 60_000 },
  '/api/auth':       { max: 10,  windowMs: 60_000 },
  '/api/unsubscribe':{ max: 10,  windowMs: 60_000 },
  '/api/track':      { max: 200, windowMs: 60_000 },  // event tracking — higher ceiling
  default:           { max: 120, windowMs: 60_000 },
}

const BLOCKED_UA_PATTERNS = [
  /python-requests/i, /go-http-client/i, /libwww-perl/i,
  /curl\//i, /wget\//i, /scrapy/i, /zgrab/i, /masscan/i, /nmap/i,
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

function addSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  // ------------------------------------------------------------------
  // Admin console routes: /internal/*
  // Layer 1 defense: verify a Supabase session exists before serving any
  // admin content. Layer 2 (full email verification) happens inside each
  // server component via requireSuperAdmin().
  // ------------------------------------------------------------------
  if (pathname.startsWith('/internal/')) {
    const response = NextResponse.next()

    // Reconstruct a Supabase SSR client so we can read the session cookie
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: Record<string, unknown>) { response.cookies.set({ name, value, ...options }) },
          remove(name: string, options: Record<string, unknown>) { response.cookies.set({ name, value: '', ...options }) },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return addSecurityHeaders(NextResponse.redirect(loginUrl))
    }

    return addSecurityHeaders(response)
  }

  // ------------------------------------------------------------------
  // API routes: apply bot blocking + rate limiting
  // ------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    // Block known bad user agents
    const ua = request.headers.get('user-agent') ?? ''
    // Allow Resend inbound webhooks (no UA check for internal webhook paths)
    const isWebhook = pathname.startsWith('/api/inbox/') || pathname.startsWith('/api/billing/webhook')
    if (!isWebhook && (!ua || BLOCKED_UA_PATTERNS.some((p) => p.test(ua)))) {
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    }

    if (!checkRateLimit(ip, pathname)) {
      return addSecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        })
      )
    }
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/api/:path*', '/internal/:path*'],
}
