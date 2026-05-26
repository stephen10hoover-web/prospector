import { createAdminClient } from './supabase-server'
import { FREE_LIMITS } from './stripe'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export interface UsageRecord {
  searches_count: number
  emails_sent_count: number
}

export async function getUsage(userId: string): Promise<UsageRecord> {
  const supabase = createAdminClient()
  const month = currentMonth()

  const { data } = await supabase
    .from('usage')
    .select('searches_count, emails_sent_count')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  return data ?? { searches_count: 0, emails_sent_count: 0 }
}

export async function getUserPlan(userId: string): Promise<'free' | 'pro'> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single()

  if (!data) return 'free'
  if (data.plan === 'pro' && (data.status === 'active' || data.status === 'trialing')) return 'pro'
  return 'free'
}

export interface LimitCheck {
  allowed: boolean
  message?: string
  current: number
  limit: number
}

export async function checkSearchLimit(userId: string): Promise<LimitCheck> {
  const plan = await getUserPlan(userId)
  if (plan === 'pro') return { allowed: true, current: 0, limit: Infinity }

  const usage = await getUsage(userId)
  const current = usage.searches_count
  const limit = FREE_LIMITS.searches

  if (current >= limit) {
    return {
      allowed: false,
      message: `You've used all ${limit} free searches this month. Upgrade to Pro for unlimited searches.`,
      current,
      limit,
    }
  }
  return { allowed: true, current, limit }
}

export async function checkEmailLimit(userId: string): Promise<LimitCheck> {
  const plan = await getUserPlan(userId)
  if (plan === 'pro') return { allowed: true, current: 0, limit: Infinity }

  const usage = await getUsage(userId)
  const current = usage.emails_sent_count
  const limit = FREE_LIMITS.emails

  if (current >= limit) {
    return {
      allowed: false,
      message: `You've used all ${limit} free emails this month. Upgrade to Pro for unlimited outreach.`,
      current,
      limit,
    }
  }
  return { allowed: true, current, limit }
}

export async function incrementUsage(
  userId: string,
  field: 'searches_count' | 'emails_sent_count'
): Promise<void> {
  const supabase = createAdminClient()
  const month = currentMonth()

  // Atomic upsert+increment via DB function (avoids race conditions)
  await supabase.rpc('increment_usage_field', {
    p_user_id: userId,
    p_month: month,
    p_field: field,
  })
}
