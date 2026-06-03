export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const admin = createAdminClient()

  const { data: userData } = await admin.auth.admin.getUserById(id)
  const authUser = userData?.user
  if (!authUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Lift Supabase Auth ban
  await admin.auth.admin.updateUserById(id, { ban_duration: 'none' })

  // Clear ban in profile
  const { error } = await admin
    .from('user_profiles')
    .update({
      is_banned: false,
      ban_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 })

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.user.unbanned',
    resourceType: 'user',
    resourceId: id,
    metadata: { target_email: authUser.email },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true })
}
