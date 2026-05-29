export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getUserPlanStatus, getUsage, periodForPlan } from '@/lib/usage'
import { PLAN_LIMITS } from '@/lib/plans'

export async function GET(_request: NextRequest) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const [{ data: sub }, planStatus] = await Promise.all([
    adminClient
      .from('subscriptions')
      .select('plan, status, current_period_end, stripe_customer_id')
      .eq('user_id', session.user.id)
      .maybeSingle(),
    getUserPlanStatus(session.user.id),
  ])

  const period = periodForPlan(planStatus.planId)
  const usage = await getUsage(session.user.id, period)
  const limits = PLAN_LIMITS[planStatus.planId]

  return NextResponse.json({
    plan: planStatus.planId,
    status: sub?.status ?? 'trialing',
    current_period_end: sub?.current_period_end ?? null,
    stripe_customer_id: sub?.stripe_customer_id ?? null,
    is_expired: planStatus.isExpired,
    trial_days_remaining: planStatus.trialDaysRemaining,
    trial_expires_at: planStatus.trialExpiresAt?.toISOString() ?? null,
    usage,
    limits: {
      searchLimit: limits.searchLimit,
      emailLimit: limits.emailLimit,
      mileLimit: limits.mileLimit,
      generationLimit: limits.generationLimit,
      period: limits.period,
    },
  })
}
