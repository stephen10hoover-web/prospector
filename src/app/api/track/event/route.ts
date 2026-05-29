export const dynamic = 'force-dynamic'

/**
 * Internal event tracking endpoint.
 * Accepts client-side behavior events and stores them server-side.
 * Unauthenticated events are accepted (anonymous_id required).
 * Rate-limited by middleware (200 req/min per IP).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const eventSchema = z.object({
  event_name: z.string().min(1).max(100),
  session_id: z.string().min(1).max(100),
  anonymous_id: z.string().max(100).optional(),
  properties: z.record(z.unknown()).optional().default({}),
  url: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
  }

  const { event_name, session_id, anonymous_id, properties, url, referrer } = parsed.data

  // Try to resolve user from session — not required
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  const admin = createAdminClient()

  // Upsert session record
  await admin.from('user_sessions').upsert({
    id: session_id,
    user_id: session?.user.id ?? null,
    anonymous_id: anonymous_id ?? null,
    last_seen_at: new Date().toISOString(),
    ip_address: ip,
    user_agent: userAgent,
    referrer: referrer ?? null,
    landing_page: url ?? null,
  }, { onConflict: 'id', ignoreDuplicates: false })

  // Increment events count on session
  await admin.rpc('increment_session_events', { p_session_id: session_id }).maybeSingle()

  // Insert the event
  await admin.from('analytics_events').insert({
    user_id: session?.user.id ?? null,
    anonymous_id: anonymous_id ?? null,
    session_id,
    event_name,
    properties,
    url: url ?? null,
    referrer: referrer ?? null,
    user_agent: userAgent,
    ip_address: ip,
  })

  return NextResponse.json({ ok: true })
}
