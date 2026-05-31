import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit } from '@/lib/rate-limit'

// ─── Blocked user-agent patterns ──────────────────────────────────────────

const BLOCKED_UA = [
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

// ─── Routes that require authentication ───────────────────────────────────

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/leads',
  '/search',
  '/pipeline',
  '/sequences',
  '/inbox',
  '/analytics',
  '/settings',
]

// ─── Routes only for guests ───────────────────────────────────────────────

const GUEST_ONLY = ['/login', '/signup']

// ─── IP extraction ────────────────────────────────────────────────────────

function getIp(request: NextRequest): string {
  // On Vercel, x-vercel-forwarded-for contains the real client IP set by the edge network
  // and cannot be spoofed by the client. Prefer it over x-forwarded-for.
  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) {
    const ip = vercelIp.split(',').pop()?.trim()
    if (ip && /^[\d.:a-f]+$/i.test(ip)) return ip
  }
  // Fallback: take the LAST entry of x-forwarded-for (appended by the CDN edge, not client-controlled)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const last = forwarded.split(',').pop()?.trim()
    if (last && /^[\d.:a-f]+$/i.test(last)) return last
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}

// ─── Proxy ────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIp(request)

  // 1. Block known bad user-agents + rate-limit all API routes
  if (pathname.startsWith('/api/')) {
    const ua = request.headers.get('user-agent') ?? ''
    if (!ua || BLOCKED_UA.some((p) => p.test(ua))) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { allowed } = await checkRateLimit(ip, pathname)
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      })
    }
  }

  // 2. Check whether this path needs auth enforcement
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isGuestOnly = GUEST_ONLY.includes(pathname)

  // Skip session check if the route doesn't need it
  if (!needsAuth && !isGuestOnly) {
    return NextResponse.next()
  }

  // 3. Read session from cookie — no network call, fast, works reliably in Edge
  //    The server layouts do the authoritative getUser() check on protected pages.
  //    This middleware layer is a fast first-pass redirect gate.
  let hasSession = false
  try {
    const response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          // Cookie writes in middleware need to go on the response, not the request
          set(name: string, value: string, options: Record<string, unknown>) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          },
          remove(name: string, options: Record<string, unknown>) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, '', options as any)
          },
        },
      }
    )

    // getSession() reads and verifies the JWT from the cookie — no external call
    const { data } = await supabase.auth.getSession()
    hasSession = !!data.session
  } catch {
    // If session check fails for any reason, treat as unauthenticated on
    // protected routes (fail-closed) and allow on guest-only routes
    hasSession = false
  }

  // 4. Protected route — no session → login
  if (needsAuth && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 5. Guest-only route — has session → dashboard
  if (isGuestOnly && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run on all paths except Next.js internals and static assets.
     */
    '/((?!_next/static|_next/image|favicon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
