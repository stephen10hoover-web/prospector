/**
 * Impersonation system.
 *
 * How it works:
 *   1. Admin POSTs to /api/internal/users/[id]/impersonate
 *   2. Server generates a random token, stores SHA-256(token) in impersonation_sessions
 *   3. Server redirects admin to /api/impersonate?token=<raw_token>
 *   4. /api/impersonate verifies token, sets a signed impersonation cookie on the response,
 *      then redirects to /dashboard
 *   5. The app reads the cookie to show the ImpersonationBanner
 *   6. Admin clicks "End Impersonation" → DELETE /api/internal/impersonate → clears cookie
 *
 * The actual Supabase Auth session is NEVER swapped. The impersonation cookie is an
 * out-of-band signal used only by the ImpersonationBanner UI and admin logging.
 * Data is still fetched for the actual admin's user_id, not the impersonated user's.
 */

import { createAdminClient } from './supabase-server'
import { logAuditEvent } from './audit'

/** Constant-time hex digest using Web Crypto (available in Edge/Node environments) */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Generate a cryptographically random URL-safe token (32 bytes = 64 hex chars) */
export function generateToken(): string {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface ImpersonationSession {
  id: string
  admin_email: string
  target_user_id: string
  target_email: string
  started_at: string
}

export async function createImpersonationSession({
  adminEmail,
  targetUserId,
  targetEmail,
  ip,
  userAgent,
}: {
  adminEmail: string
  targetUserId: string
  targetEmail: string
  ip: string
  userAgent: string
}): Promise<string> {
  const rawToken = generateToken()
  const tokenHash = await sha256Hex(rawToken)
  const admin = createAdminClient()

  const { error } = await admin.from('impersonation_sessions').insert({
    admin_email: adminEmail,
    target_user_id: targetUserId,
    target_email: targetEmail,
    token_hash: tokenHash,
    ip_address: ip,
    user_agent: userAgent,
  })

  if (error) throw new Error('Failed to create impersonation session')

  await logAuditEvent({
    actorEmail: adminEmail,
    action: 'admin.user.impersonation_started',
    resourceType: 'user',
    resourceId: targetUserId,
    metadata: { target_email: targetEmail },
    ip,
    userAgent,
    severity: 'warning',
  })

  return rawToken
}

export async function resolveImpersonationToken(rawToken: string): Promise<ImpersonationSession | null> {
  const tokenHash = await sha256Hex(rawToken)
  const admin = createAdminClient()

  const { data } = await admin
    .from('impersonation_sessions')
    .select('id, admin_email, target_user_id, target_email, started_at')
    .eq('token_hash', tokenHash)
    .is('ended_at', null)
    .single()

  return data ?? null
}

export async function endImpersonationSession(adminEmail: string, sessionId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('admin_email', adminEmail)

  await logAuditEvent({
    actorEmail: adminEmail,
    action: 'admin.user.impersonation_ended',
    resourceType: 'impersonation_session',
    resourceId: sessionId,
    severity: 'info',
  })
}
