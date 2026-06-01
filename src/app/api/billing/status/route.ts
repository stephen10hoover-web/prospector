export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getUserPlanStatus, getUsage, periodForPlan } from '@/lib/usage'
import { PLAN_LIMITS } from '@/lib/plans'

export async function GET(_request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
    } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const [{ data: sub }, planStatus] = await Promise.all([
    adminClient
      .from('subscriptions')
      // stripe_customer_id is intentionally omitted — it is an internal identifier
      // that should never be exposed to the client.
      .select('plan, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user!.id)
      .maybeSingle(),
    getUserPlanStatus(user!.id),
  ])

  const period = periodForPlan(planStatus.planId)
  const usage = await getUsage(user!.id, period)
  const limits = PLAN_LIMITS[planStatus.planId]

  return NextResponse.json({
    plan: planStatus.planId,
    status: sub?.status ?? 'trialing',
    current_period_end: sub?.current_period_end ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
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
