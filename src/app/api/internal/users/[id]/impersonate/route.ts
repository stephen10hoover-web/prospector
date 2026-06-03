export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { createImpersonationSession } from '@/lib/impersonation'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  // Require typed confirmation = 'IMPERSONATE'
  if (body.confirmation !== 'IMPERSONATE') {
    return NextResponse.json({ error: 'Type IMPERSONATE to confirm' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: userData } = await admin.auth.admin.getUserById(id)
  const targetUser = userData?.user
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const rawToken = await createImpersonationSession({
    adminEmail: auth.user.email!,
    targetUserId: id,
    targetEmail: targetUser.email ?? id,
    ip: auth.ip,
    userAgent: auth.userAgent,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUrl = `${appUrl}/api/impersonate?token=${rawToken}`

  return NextResponse.json({ redirect_url: redirectUrl })
}
