export const dynamic = 'force-dynamic'

/**
 * Daily MRR snapshot cron.
 * Runs at 00:05 UTC every day to capture plan counts and MRR.
 * Uses UPSERT on snapshot_date so re-runs are idempotent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { PLAN_META } from '@/lib/plans'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('subscriptions')
    .select('plan, status')

  const all = subs ?? []
  const proActive  = all.filter((s) => s.plan === 'pro'  && s.status === 'active').length
  const teamActive = all.filter((s) => s.plan === 'team' && s.status === 'active').length
  const trialCount = all.filter((s) => s.plan === 'free_trial').length

  const mrrCents = Math.round(
    proActive  * (PLAN_META.pro.price  ?? 0) * 100 +
    teamActive * (PLAN_META.team.price ?? 0) * 100
  )

  const snapshotDate = new Date().toISOString().split('T')[0]

  const { error } = await admin
    .from('mrr_snapshots')
    .upsert(
      {
        snapshot_date: snapshotDate,
        mrr_cents: mrrCents,
        pro_count: proActive,
        team_count: teamActive,
        trial_count: trialCount,
      },
      { onConflict: 'snapshot_date' }
    )

  if (error) {
    console.error('[cron/mrr-snapshot] failed:', error)
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 })
  }

  await logAuditEvent({
    actorEmail: 'cron',
    action: 'cron.mrr_snapshot.completed',
    metadata: { snapshot_date: snapshotDate, mrr_cents: mrrCents, pro_count: proActive, team_count: teamActive },
    severity: 'info',
  })

  return NextResponse.json({
    ok: true,
    snapshot_date: snapshotDate,
    mrr_cents: mrrCents,
    pro_count: proActive,
    team_count: teamActive,
    trial_count: trialCount,
  })
}
