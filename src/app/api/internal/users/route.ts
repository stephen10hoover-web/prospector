export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { auditAdminAction } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const perPage = Math.min(100, Math.max(10, parseInt(searchParams.get('per_page') ?? '50')))
  const search = searchParams.get('search')?.toLowerCase() ?? ''

  const admin = createAdminClient()

  // Fetch users from Supabase Auth
  const { data: authData } = await admin.auth.admin.listUsers({ page: page + 1, perPage: 1000 })
  const allUsers = authData?.users ?? []

  // Fetch all subscriptions + profiles for enrichment
  const [{ data: subs }, { data: profiles }] = await Promise.all([
    admin.from('subscriptions').select('user_id, plan, status, created_at, current_period_end'),
    admin.from('user_profiles').select('id, sending_email'),
  ])

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]))
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Merge
  let users = allUsers.map((u) => {
    const sub = subMap.get(u.id)
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      plan: sub?.plan ?? 'free_trial',
      status: sub?.status ?? 'trialing',
      sending_email: profile?.sending_email ?? null,
    }
  })

  // Filter
  if (search) {
    users = users.filter(
      (u) => u.email.toLowerCase().includes(search) || u.sending_email?.toLowerCase().includes(search)
    )
  }

  const total = users.length
  const paginated = users
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(page * perPage, (page + 1) * perPage)

  await auditAdminAction({
    adminEmail: auth.session.user.email!,
    action: 'admin.users.listed',
    metadata: { page, perPage, search: search || undefined },
    ip: auth.ip,
  })

  return NextResponse.json({ users: paginated, total, page, perPage })
}
