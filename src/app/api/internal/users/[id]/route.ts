export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { deleteUserAccount } from '@/lib/account-deletion'
import { auditAdminAction } from '@/lib/audit'
import type { DeleteUserBody } from '@/types/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const admin = createAdminClient()

  const [
    { data: authData, error: userError },
    { data: sub },
    { data: profile },
    { data: notes },
    { count: totalLeads },
    { count: totalEmails },
    { count: totalSearches },
  ] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from('subscriptions').select('*').eq('user_id', id).single(),
    admin.from('user_profiles').select('*').eq('id', id).single(),
    admin.from('user_admin_notes')
      .select('id, admin_email, body, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    admin.from('businesses').select('*', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('outreach_logs').select('*', { count: 'exact', head: true }).eq('user_id', id).eq('status', 'sent'),
    admin.from('searches').select('*', { count: 'exact', head: true }).eq('user_id', id),
  ])

  const authUser = authData?.user
  if (userError || !authUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: authUser.id,
    email: authUser.email ?? '',
    created_at: authUser.created_at,
    last_sign_in_at: authUser.last_sign_in_at ?? null,
    plan: sub?.plan ?? 'free_trial',
    status: sub?.status ?? 'trialing',
    sending_email: profile?.sending_email ?? null,
    is_suspended: profile?.is_suspended ?? false,
    is_banned: profile?.is_banned ?? false,
    suspended_at: profile?.suspended_at ?? null,
    suspended_until: profile?.suspended_until ?? null,
    ban_reason: profile?.ban_reason ?? null,
    stripe_subscription_id: sub?.stripe_subscription_id ?? null,
    current_period_end: sub?.current_period_end ?? null,
    trial_ends_at: sub?.trial_ends_at ?? null,
    total_leads: totalLeads ?? 0,
    total_emails_sent: totalEmails ?? 0,
    total_searches: totalSearches ?? 0,
    notes: notes ?? [],
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({})) as DeleteUserBody

  const admin = createAdminClient()
  const { data: deleteData } = await admin.auth.admin.getUserById(id)
  const authUser = deleteData?.user
  if (!authUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Require typed confirmation = user's email
  if (body.confirmation !== authUser.email) {
    return NextResponse.json({ error: 'Confirmation does not match user email' }, { status: 400 })
  }

  try {
    await deleteUserAccount({ userId: id, deletedBy: auth.user.email! })
    await auditAdminAction({
      adminEmail: auth.user.email!,
      action: 'admin.user.deleted',
      resourceType: 'user',
      resourceId: id,
      metadata: { target_email: authUser.email },
      ip: auth.ip,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin] user deletion error:', err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
