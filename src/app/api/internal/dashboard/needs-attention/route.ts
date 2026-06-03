export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'

interface NeedsAttentionItem {
  type: 'failed_payments' | 'trials_expiring' | 'users_at_limit' | 'critical_events'
  count: number
  label: string
  description: string
  cta: string
  cta_href: string
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const admin = createAdminClient()
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: failedPayments },
    { count: trialsExpiring },
    { count: criticalEvents },
    { data: subs },
  ] = await Promise.all([
    admin.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'past_due'),
    admin.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free_trial')
      .lte('trial_ends_at', in48h)
      .gte('trial_ends_at', now.toISOString()),
    admin.from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .gte('created_at', last24h),
    // Fetch usage to compute users at limit — approximate by looking at high usage
    admin.from('subscriptions')
      .select('user_id, plan')
      .eq('plan', 'free_trial'),
  ])

  const items: NeedsAttentionItem[] = []

  if ((failedPayments ?? 0) > 0) {
    items.push({
      type: 'failed_payments',
      count: failedPayments ?? 0,
      label: `${failedPayments} Failed Payment${failedPayments !== 1 ? 's' : ''}`,
      description: 'These users have active subscriptions with declined cards. Revenue at risk until resolved.',
      cta: 'Review users',
      cta_href: '/internal/core/ops/console/users?status=past_due',
    })
  }

  if ((trialsExpiring ?? 0) > 0) {
    items.push({
      type: 'trials_expiring',
      count: trialsExpiring ?? 0,
      label: `${trialsExpiring} Trial${trialsExpiring !== 1 ? 's' : ''} Expiring Soon`,
      description: 'These trials end within 48 hours. Users with high engagement are strong conversion candidates.',
      cta: 'View trial users',
      cta_href: '/internal/core/ops/console/users?plan=free_trial',
    })
  }

  if ((criticalEvents ?? 0) > 0) {
    items.push({
      type: 'critical_events',
      count: criticalEvents ?? 0,
      label: `${criticalEvents} Critical Event${criticalEvents !== 1 ? 's' : ''}`,
      description: 'Security or system events flagged in the last 24 hours that require manual review.',
      cta: 'Open audit log',
      cta_href: '/internal/core/ops/console/audit?severity=critical',
    })
  }

  return NextResponse.json({ items, all_clear: items.length === 0 })
}
