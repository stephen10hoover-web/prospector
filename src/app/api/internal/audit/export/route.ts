export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'

const MAX_INLINE = 10_000 // rows returned synchronously as CSV

function rowToCsv(row: Record<string, unknown>): string {
  const fields = [
    row.created_at,
    row.severity,
    row.action,
    row.actor_email,
    row.ip_address ?? '',
    row.resource_type ?? '',
    row.resource_id ?? '',
    JSON.stringify(row.metadata ?? {}),
  ]
  return fields.map((f) => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',')
}

const CSV_HEADER = 'created_at,severity,action,actor_email,ip_address,resource_type,resource_id,metadata\n'

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const severity = body.severity as string | undefined
  const action = body.action as string | undefined
  const after = body.after as string | undefined
  const before = body.before as string | undefined

  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (severity) query = query.eq('severity', severity)
  if (action) query = query.ilike('action', `%${action}%`)
  if (after) query = query.gte('created_at', after)
  if (before) query = query.lte('created_at', before)

  // Get total count first
  const { count } = await query.limit(0)
  const total = count ?? 0

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.audit.export',
    metadata: { total_rows: total, filters: { severity, action, after, before } },
    ip: auth.ip,
  })

  if (total > MAX_INLINE) {
    // For large exports, return a 202 with instructions (async job is Phase 2)
    return NextResponse.json(
      {
        message: `Export of ${total.toLocaleString()} rows is too large for inline download. Maximum is ${MAX_INLINE.toLocaleString()} rows. Narrow your filters and try again.`,
        total,
        max_inline: MAX_INLINE,
      },
      { status: 202 }
    )
  }

  // Fetch all rows and stream as CSV
  const { data } = await query.limit(MAX_INLINE)
  const rows = data ?? []

  const csv =
    CSV_HEADER +
    rows.map((r) => rowToCsv(r as Record<string, unknown>)).join('\n')

  const filename = `audit-export-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
