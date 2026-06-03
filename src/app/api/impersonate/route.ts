export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { resolveImpersonationToken, endImpersonationSession } from '@/lib/impersonation'

const IMPERSONATION_COOKIE = 'impersonation_session'
const COOKIE_MAX_AGE = 60 * 60 // 1 hour

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const session = await resolveImpersonationToken(token)
  if (!session) {
    return NextResponse.redirect(new URL('/internal/core/ops/console', request.url))
  }

  // Set impersonation context cookie (signed by browser — no sensitive data stored)
  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  response.cookies.set(IMPERSONATION_COOKIE, JSON.stringify({
    sessionId: session.id,
    adminEmail: session.admin_email,
    targetEmail: session.target_email,
    targetUserId: session.target_user_id,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}

export async function DELETE(request: NextRequest) {
  const cookieVal = request.cookies.get(IMPERSONATION_COOKIE)?.value
  const response = NextResponse.json({ success: true })

  if (cookieVal) {
    try {
      const { sessionId, adminEmail } = JSON.parse(cookieVal)
      if (sessionId && adminEmail) {
        await endImpersonationSession(adminEmail, sessionId)
      }
    } catch {
      // Cookie was malformed — just clear it
    }
  }

  response.cookies.set(IMPERSONATION_COOKIE, '', {
    maxAge: 0,
    path: '/',
  })

  return response
}
