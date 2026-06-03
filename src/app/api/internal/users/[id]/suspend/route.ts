export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'
import type { SuspendBody } from '@/types/admin'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({})) as SuspendBody

  if (!body.reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  if (body.confirmation !== 'SUSPEND') {
    return NextResponse.json({ error: 'Type SUSPEND to confirm' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify user exists
  const { data: userData } = await admin.auth.admin.getUserById(id)
  const authUser = userData?.user
  if (!authUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const suspendedUntil = body.suspend_until ?? null

  const { error } = await admin
    .from('user_profiles')
    .upsert({
      id,
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_until: suspendedUntil,
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: 'Failed to suspend user' }, { status: 500 })

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.user.suspended',
    resourceType: 'user',
    resourceId: id,
    metadata: {
      target_email: authUser.email,
      reason: body.reason,
      suspend_until: suspendedUntil,
    },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true })
}
