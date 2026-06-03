export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { invalidateSubscriptionCache } from '@/lib/usage'
import { auditAdminAction } from '@/lib/audit'
import type { TrialExtendBody } from '@/types/admin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({})) as TrialExtendBody

  const days = parseInt(String(body.days))
  if (!days || days < 1 || days > 365) {
    return NextResponse.json({ error: 'days must be 1–365' }, { status: 400 })
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: sub } = await admin
    .from('subscriptions')
    .select('trial_ends_at, plan')
    .eq('user_id', id)
    .single()

  // Calculate new trial end: extend from now or existing end, whichever is later
  const baseDate = sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date()
    ? new Date(sub.trial_ends_at)
    : new Date()
  const newTrialEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

  const { error } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: id,
        plan: sub?.plan ?? 'free_trial',
        trial_ends_at: newTrialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: 'Failed to extend trial' }, { status: 500 })

  invalidateSubscriptionCache(id)

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.user.trial_extended',
    resourceType: 'user',
    resourceId: id,
    metadata: { days, new_trial_end: newTrialEnd.toISOString(), reason: body.reason },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true, trial_ends_at: newTrialEnd.toISOString() })
}
