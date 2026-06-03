export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { invalidateSubscriptionCache } from '@/lib/usage'
import { auditAdminAction } from '@/lib/audit'
import type { PlanOverrideBody } from '@/types/admin'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({})) as PlanOverrideBody

  if (!body.plan) return NextResponse.json({ error: 'plan is required' }, { status: 400 })
  if (!body.reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify confirmation matches user email
  const { data: userData } = await admin.auth.admin.getUserById(id)
  const authUser = userData?.user
  if (!authUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (body.confirmation !== authUser.email) {
    return NextResponse.json({ error: 'Confirmation does not match user email' }, { status: 400 })
  }

  const { error } = await admin
    .from('subscriptions')
    .upsert(
      { user_id: id, plan: body.plan, status: 'active', updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })

  invalidateSubscriptionCache(id)

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.user.plan_override',
    resourceType: 'user',
    resourceId: id,
    metadata: { target_email: authUser.email, plan: body.plan, reason: body.reason },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true, plan: body.plan })
}
