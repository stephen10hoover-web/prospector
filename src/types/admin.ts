/**
 * TypeScript interfaces for the admin console.
 * All admin data is server-fetched; these types are shared between
 * API routes and Server Components.
 */

import type { PlanId } from '@/lib/plans'

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  plan: PlanId
  status: string
  sending_email: string | null
  /** Populated on detail page only */
  is_suspended?: boolean
  is_banned?: boolean
  suspended_at?: string | null
  suspended_until?: string | null
  ban_reason?: string | null
}

export interface AdminUserDetail extends AdminUser {
  // Subscription
  stripe_subscription_id: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  // Activity counters
  total_leads: number
  total_emails_sent: number
  total_searches: number
  // Admin notes
  notes: AdminNote[]
  // Subscription history
  subscription_history: SubscriptionHistoryEntry[]
}

export interface AdminNote {
  id: string
  admin_email: string
  body: string
  created_at: string
}

export interface SubscriptionHistoryEntry {
  plan: PlanId
  status: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  actor_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  severity: AuditSeverity
  created_at: string
}

export interface AuditLogFilters {
  severity?: AuditSeverity
  action?: string
  actor?: string
  after?: string
  before?: string
}

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

export interface AdminMetrics {
  totalUsers: number
  proActive: number
  teamActive: number
  trials: number
  mrr: number
  churnedThisMonth: number
  newToday: number
  newWeek: number
  recentAudit: AuditLogEntry[]
}

export interface MrrSnapshot {
  snapshot_date: string
  mrr_cents: number
  pro_count: number
  team_count: number
}

// ---------------------------------------------------------------------------
// Admin actions — request/response bodies
// ---------------------------------------------------------------------------

export interface PlanOverrideBody {
  plan: PlanId
  reason: string
  confirmation: string // must equal user email
}

export interface TrialExtendBody {
  days: number
  reason: string
}

export interface SuspendBody {
  reason: string
  suspend_until?: string // ISO date; omit for indefinite
  confirmation: string // must equal 'SUSPEND'
}

export interface BanBody {
  reason: string
  confirmation: string // must equal 'BAN'
}

export interface DeleteUserBody {
  confirmation: string // must equal user email
}

export interface AdminNoteBody {
  body: string
}

// ---------------------------------------------------------------------------
// Suspension / ban status (for middleware cache)
// ---------------------------------------------------------------------------

export interface SuspensionStatus {
  is_suspended: boolean
  is_banned: boolean
  suspended_at: string | null
  suspended_until: string | null
  ban_reason: string | null
}
