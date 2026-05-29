export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
  const perPage = Math.min(100, parseInt(searchParams.get('per_page') ?? '50'))
  const severity = searchParams.get('severity') // 'info' | 'warning' | 'critical'
  const action = searchParams.get('action')

  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * perPage, (page + 1) * perPage - 1)

  if (severity) query = query.eq('severity', severity)
  if (action) query = query.ilike('action', `%${action}%`)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, perPage })
}
