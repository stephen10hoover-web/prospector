/**
 * Next.js Middleware — Admin Route Protection
 *
 * Layer 1 defense: blocks unauthenticated requests to /internal/* and
 * /api/internal/* before they reach any Server Component or Route Handler.
 *
 * Layer 2 (in requireSuperAdmin / verifyAdminRequest): verifies the
 * authenticated user's email matches SUPER_ADMIN_EMAIL.
 *
 * Suspension enforcement: redirects suspended/banned users on all
 * authenticated routes (except /suspended, /banned, /login, and static assets).
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_PATHS = ['/internal/', '/api/internal/']
const SUSPENSION_BYPASS = ['/suspended', '/banned', '/login', '/signup', '/api/auth/']

/** Simple in-process suspension cache: userId → { suspended, banned, at } */
const suspensionCache = new Map<string, { suspended: boolean; banned: boolean; at: number }>()
const SUSPENSION_TTL_MS = 60_000

function shouldBypassSuspensionCheck(pathname: string): boolean {
  return SUSPENSION_BYPASS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const isApiRoute = pathname.startsWith('/api/')

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Build Supabase client that can read/refresh cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
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

  // Server-side validated JWT — prevents stale token bypass
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // -------------------------------------------------------------------------
  // Admin path protection (Layer 1)
  // -------------------------------------------------------------------------
  if (isAdminPath) {
    if (!user) {
      if (isApiRoute) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Authorized users proceed; Layer 2 in admin.ts validates email === SUPER_ADMIN_EMAIL
    return response
  }

  // -------------------------------------------------------------------------
  // Suspension enforcement for authenticated users on non-admin paths
  // -------------------------------------------------------------------------
  if (user && !shouldBypassSuspensionCheck(pathname)) {
    const cached = suspensionCache.get(user.id)
    let suspended = false
    let banned = false

    if (cached && Date.now() - cached.at < SUSPENSION_TTL_MS) {
      suspended = cached.suspended
      banned = cached.banned
    } else {
      // Fetch from user_profiles (service-role not needed — public read of own row via JWT)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_suspended, is_banned')
        .eq('id', user.id)
        .single()

      suspended = profile?.is_suspended ?? false
      banned = profile?.is_banned ?? false
      suspensionCache.set(user.id, { suspended, banned, at: Date.now() })
    }

    if (banned) {
      if (isApiRoute) {
        return new NextResponse(JSON.stringify({ error: 'Account banned' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return NextResponse.redirect(new URL('/banned', request.url))
    }

    if (suspended) {
      if (isApiRoute) {
        return new NextResponse(JSON.stringify({ error: 'Account suspended' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return NextResponse.redirect(new URL('/suspended', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (static files)
     *  - _next/image (image optimization)
     *  - favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
