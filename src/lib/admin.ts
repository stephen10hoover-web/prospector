/**
 * Super-Admin Security Module
 *
 * Authorization model:
 *   - There is exactly ONE super-admin, identified solely by email.
 *   - The email is loaded from an environment variable — never from the DB,
 *     never from a client claim, never from localStorage or JWT payload.
 *   - Admin status CANNOT be granted via the UI, API, or DB manipulation.
 *   - Every admin route calls requireSuperAdmin() or verifyAdminRequest()
 *     as its FIRST operation — before rendering any data.
 *
 * Defense layers:
 *   1. Middleware: blocks unauthenticated requests to /internal/* and /api/internal/*
 *   2. Server component / API route: verifies email === SUPER_ADMIN_EMAIL
 *   3. All access attempts (authorized or not) are audit-logged
 */

import { createServerClient } from './supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { logAuditEvent } from './audit'
import type { Session } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Identity helpers
// ---------------------------------------------------------------------------

export function getSuperAdminEmail(): string {
  const email = process.env.SUPER_ADMIN_EMAIL
  if (!email) throw new Error('SUPER_ADMIN_EMAIL is not configured')
  return email.toLowerCase().trim()
}

/**
 * Pure function — safe to call anywhere.
 * Authorization is a string equality check against an env var; nothing more.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === getSuperAdminEmail()
}

// ---------------------------------------------------------------------------
// Server Component guard
// ---------------------------------------------------------------------------

interface AdminContext {
  session: Session
  ip: string
  userAgent: string
}

/**
 * Call at the top of every admin Server Component page.
 * On failure: logs a critical audit event and redirects to /login.
 * On success: returns the verified session + request metadata.
 */
export async function requireSuperAdmin(label?: string): Promise<AdminContext> {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const reqHeaders = headers()
  const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const userAgent = reqHeaders.get('user-agent') ?? 'unknown'

  if (!session || !isSuperAdmin(session.user.email)) {
    await logAuditEvent({
      actorEmail: session?.user?.email ?? 'anonymous',
      action: 'security.unauthorized_admin_access',
      metadata: { label: label ?? 'admin_route', email: session?.user?.email ?? null },
      ip,
      userAgent,
      severity: 'critical',
    })
    redirect('/login')
  }

  return { session, ip, userAgent }
}

// ---------------------------------------------------------------------------
// API Route guard
// ---------------------------------------------------------------------------

type AdminVerifyResult =
  | { ok: true; session: Session; ip: string; userAgent: string }
  | { ok: false; response: Response }

/**
 * Call at the top of every /api/internal/* route handler.
 * Returns a discriminated union — check `result.ok` before proceeding.
 */
export async function verifyAdminRequest(request: Request): Promise<AdminVerifyResult> {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const userAgent = request.headers.get('user-agent') ?? 'unknown'

  if (!session || !isSuperAdmin(session.user.email)) {
    await logAuditEvent({
      actorEmail: session?.user?.email ?? 'anonymous',
      action: 'security.unauthorized_api_access',
      metadata: { url: request.url, email: session?.user?.email ?? null },
      ip,
      userAgent,
      severity: 'critical',
    })
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return { ok: true, session, ip, userAgent }
}
