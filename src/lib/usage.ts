import { createAdminClient } from './supabase-server'
import { PLAN_LIMITS, TRIAL_DAYS, type PlanId } from './plans'

// --- Period helpers ---

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function currentWeek(): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const day = d.getUTCDay()
  // Shift to Monday-based week
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function periodForPlan(planId: PlanId): string {
  return PLAN_LIMITS[planId].period === 'week' ? currentWeek() : currentMonth()
}

// --- Plan resolution ---

export interface PlanStatus {
  planId: PlanId
  isExpired: boolean
  trialExpiresAt: Date | null
  trialDaysRemaining: number | null
}

export async function getUserPlanStatus(userId: string): Promise<PlanStatus> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, trial_started_at')
    .eq('user_id', userId)
    .maybeSingle()

  // No subscription row yet (being provisioned) — treat as fresh trial
  if (!data) {
    return {
      planId: 'free_trial',
      isExpired: false,
      trialExpiresAt: null,
      trialDaysRemaining: TRIAL_DAYS,
    }
  }

  const planId = (data.plan ?? 'free_trial') as PlanId

  if (planId === 'free_trial') {
    const started = data.trial_started_at ? new Date(data.trial_started_at) : new Date()
    const expiresAt = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const now = new Date()
    const isExpired = now > expiresAt
    const msLeft = expiresAt.getTime() - now.getTime()
    const daysLeft = isExpired ? 0 : Math.ceil(msLeft / (1000 * 60 * 60 * 24))
    return { planId: 'free_trial', isExpired, trialExpiresAt: expiresAt, trialDaysRemaining: daysLeft }
  }

  // Paid plan — check it's active
  const isActive = data.status === 'active' || data.status === 'trialing'
  if (!isActive) {
    // Subscription lapsed — block like an expired trial
    return { planId: 'free_trial', isExpired: true, trialExpiresAt: null, trialDaysRemaining: 0 }
  }

  return { planId, isExpired: false, trialExpiresAt: null, trialDaysRemaining: null }
}

/** Convenience — just the PlanId */
export async function getUserPlan(userId: string): Promise<PlanId> {
  return (await getUserPlanStatus(userId)).planId
}

// --- Usage ---

export interface UsageRecord {
  searches_count: number
  emails_sent_count: number
}

export async function getUsage(userId: string, period?: string): Promise<UsageRecord> {
  const supabase = createAdminClient()
  const p = period ?? currentMonth()

  const { data } = await supabase
    .from('usage')
    .select('searches_count, emails_sent_count')
    .eq('user_id', userId)
    .eq('month', p)
    .single()

  return data ?? { searches_count: 0, emails_sent_count: 0 }
}

export interface LimitCheck {
  allowed: boolean
  message?: string
  current: number
  limit: number
  upgrade?: boolean
}

/**
 * Atomically check usage limit AND increment in one DB round-trip.
 * Returns allowed=true+increments if under limit; allowed=false if at/over.
 */
export async function atomicCheckAndIncrement(
  userId: string,
  field: 'searches_count' | 'emails_sent_count' | 'outreach_generated_count',
  limit: number,
  period?: string
): Promise<{ allowed: boolean }> {
  const supabase = createAdminClient()
  const p = period ?? currentMonth()

  const { data, error } = await supabase.rpc('check_and_increment_usage', {
    p_user_id: userId,
    p_month: p,
    p_field: field,
    p_limit: limit,
  })

  if (error) {
    console.error('[usage] check_and_increment_usage failed:', error.message)
    return { allowed: false }
  }

  return { allowed: data === true }
}

export async function checkSearchLimit(userId: string): Promise<LimitCheck> {
  const planStatus = await getUserPlanStatus(userId)

  if (planStatus.isExpired) {
    return { allowed: false, message: 'Your free trial has expired. Upgrade to continue.', current: 0, limit: 0, upgrade: true }
  }

  const limits = PLAN_LIMITS[planStatus.planId]
  const period = periodForPlan(planStatus.planId)
  const usage = await getUsage(userId, period)
  const current = usage.searches_count
  const limit = limits.searchLimit
  const periodLabel = limits.period === 'week' ? 'this week' : 'this month'

  if (current >= limit) {
    return { allowed: false, message: `You've used all ${limit} searches ${periodLabel}. Upgrade to get more.`, current, limit, upgrade: true }
  }
  return { allowed: true, current, limit }
}

export async function checkEmailLimit(userId: string): Promise<LimitCheck> {
  const planStatus = await getUserPlanStatus(userId)

  if (planStatus.isExpired) {
    return { allowed: false, message: 'Your free trial has expired. Upgrade to continue.', current: 0, limit: 0, upgrade: true }
  }

  const limits = PLAN_LIMITS[planStatus.planId]
  const period = periodForPlan(planStatus.planId)
  const usage = await getUsage(userId, period)
  const current = usage.emails_sent_count
  const limit = limits.emailLimit
  const periodLabel = limits.period === 'week' ? 'this week' : 'this month'

  if (current >= limit) {
    return { allowed: false, message: `You've used all ${limit} emails ${periodLabel}. Upgrade to get more.`, current, limit, upgrade: true }
  }
  return { allowed: true, current, limit }
}

export async function checkOutreachGenerationLimit(userId: string): Promise<LimitCheck> {
  const planStatus = await getUserPlanStatus(userId)

  if (planStatus.isExpired) {
    return { allowed: false, message: 'Your free trial has expired. Upgrade to continue.', current: 0, limit: 0, upgrade: true }
  }

  const limits = PLAN_LIMITS[planStatus.planId]
  const period = periodForPlan(planStatus.planId)
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('usage')
    .select('outreach_generated_count')
    .eq('user_id', userId)
    .eq('month', period)
    .single()

  const current = (data as { outreach_generated_count?: number } | null)?.outreach_generated_count ?? 0
  const limit = limits.generationLimit
  const periodLabel = limits.period === 'week' ? 'this week' : 'this month'

  if (current >= limit) {
    return { allowed: false, message: `You've used all ${limit} AI generations ${periodLabel}. Upgrade to get more.`, current, limit, upgrade: true }
  }
  return { allowed: true, current, limit }
}

/** Returns the maximum search radius in miles for the user's current plan */
export async function getMileLimit(userId: string): Promise<number> {
  const planStatus = await getUserPlanStatus(userId)
  return PLAN_LIMITS[planStatus.planId].mileLimit
}

export async function incrementUsage(
  userId: string,
  field: 'searches_count' | 'emails_sent_count' | 'outreach_generated_count',
  period?: string
): Promise<void> {
  const supabase = createAdminClient()
  const p = period ?? currentMonth()

  await supabase.rpc('increment_usage_field', {
    p_user_id: userId,
    p_month: p,
    p_field: field,
  })
}
