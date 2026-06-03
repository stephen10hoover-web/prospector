export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'
import type { BanBody } from '@/types/admin'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({})) as BanBody

  if (!body.reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  if (body.confirmation !== 'BAN') {
    return NextResponse.json({ error: 'Type BAN to confirm' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: userData } = await admin.auth.admin.getUserById(id)
  const authUser = userData?.user
  if (!authUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Ban in Supabase Auth first (prevents new sessions)
  await admin.auth.admin.updateUserById(id, { ban_duration: '876600h' }) // ~100 years

  // Mark in profile for middleware enforcement
  const { error } = await admin
    .from('user_profiles')
    .upsert({
      id,
      is_banned: true,
      is_suspended: false, // ban supersedes suspension
      ban_reason: body.reason.trim(),
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 })

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.user.banned',
    resourceType: 'user',
    resourceId: id,
    metadata: { target_email: authUser.email, reason: body.reason },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true })
}
