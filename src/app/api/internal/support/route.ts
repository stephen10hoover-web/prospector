export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? ''
  const category = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''
  const cursor = searchParams.get('cursor')
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '25'))

  const admin = createAdminClient()
  let query = admin
    .from('support_submissions')
    .select('id, user_email, subject, category, status, admin_reply, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (search) query = query.or(`subject.ilike.%${search}%,user_email.ilike.%${search}%`)
  if (cursor) query = query.lt('created_at', cursor)

  const { data, count } = await query
  const rows = data ?? []
  const hasMore = rows.length > limit
  if (hasMore) rows.pop()

  return NextResponse.json({
    tickets: rows,
    total: count ?? 0,
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1]?.created_at : null,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const { id, status, reply } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) update.status = status
  if (reply !== undefined) {
    update.admin_reply = reply
    update.replied_by = auth.user.email
    update.replied_at = new Date().toISOString()
    if (status === undefined) update.status = 'resolved'
  }

  const { error } = await admin.from('support_submissions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.support.ticket_updated',
    resourceType: 'support_submission',
    resourceId: id,
    metadata: { status, has_reply: !!reply },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true })
}
