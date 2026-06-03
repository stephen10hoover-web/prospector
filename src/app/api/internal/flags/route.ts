export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { invalidateFlagCache } from '@/lib/feature-flags'
import { auditAdminAction } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('feature_flags')
    .select('*')
    .order('key')

  if (error) return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 })
  return NextResponse.json({ flags: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const { key, enabled } = body

  if (!key || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'key (string) and enabled (boolean) required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('feature_flags')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 })

  invalidateFlagCache(key)

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: enabled ? 'admin.flag.enabled' : 'admin.flag.disabled',
    resourceType: 'feature_flag',
    resourceId: key,
    metadata: { key, enabled },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true, key, enabled })
}
