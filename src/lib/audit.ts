/**
 * Immutable audit logging.
 *
 * Rules:
 *   - Always uses the service-role admin client (bypasses RLS).
 *   - Never throws — audit failures must never crash primary application flows.
 *   - The underlying table is append-only (DB-level UPDATE/DELETE rules block mutations).
 *   - Structured severity: info | warning | critical
 */

import { createAdminClient } from './supabase-server'

export interface AuditEventParams {
  actorId?: string | null
  actorEmail: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  severity?: 'info' | 'warning' | 'critical'
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      actor_id:      params.actorId ?? null,
      actor_email:   params.actorEmail,
      action:        params.action,
      resource_type: params.resourceType ?? null,
      resource_id:   params.resourceId ?? null,
      metadata:      params.metadata ?? {},
      ip_address:    params.ip ?? null,
      user_agent:    params.userAgent ?? null,
      severity:      params.severity ?? 'info',
    })
  } catch (err) {
    // Never propagate — silently log to stderr
    console.error('[audit] write failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers for common admin actions
// ---------------------------------------------------------------------------

export async function auditAdminAction(params: {
  adminEmail: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string
}) {
  return logAuditEvent({ ...params, actorEmail: params.adminEmail, severity: 'info' })
}
