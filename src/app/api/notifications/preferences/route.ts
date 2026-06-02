export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// GET /api/notifications/preferences — returns current user's notification preferences
export async function GET(_request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('notification_preferences')
    .select('trial_reminders, usage_warnings, subscription_events, win_back')
    .eq('user_id', user.id)
    .maybeSingle()

  // Return defaults if no row exists yet
  return NextResponse.json(data ?? {
    trial_reminders: true,
    usage_warnings: true,
    subscription_events: true,
    win_back: false,
  })
}

// PATCH /api/notifications/preferences — updates one or more preference fields
export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Only allow known boolean preference fields
  const allowed = ['trial_reminders', 'usage_warnings', 'subscription_events', 'win_back'] as const
  const update: Record<string, boolean> = {}
  for (const key of allowed) {
    const val = (body as Record<string, unknown>)[key]
    if (typeof val === 'boolean') update[key] = val
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, ...update, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[notifications/preferences] upsert failed:', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
