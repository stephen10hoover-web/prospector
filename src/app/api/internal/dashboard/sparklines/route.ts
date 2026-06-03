export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const admin = createAdminClient()

  // Get last 30 days of MRR snapshots
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const { data } = await admin
    .from('mrr_snapshots')
    .select('snapshot_date, mrr_cents, pro_count, team_count, trial_count')
    .gte('snapshot_date', cutoff.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true })

  return NextResponse.json({ sparklines: data ?? [] })
}
