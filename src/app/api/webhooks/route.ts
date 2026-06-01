export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'
import crypto from 'crypto'

const VALID_EVENTS = [
  'lead_replied',
  'proposal_sent',
  'proposal_viewed',
  'deal_won',
  'sequence_enrolled',
  'sequence_completed',
] as const

const createSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(VALID_EVENTS)).min(1).max(10),
  active: z.boolean().default(true),
})

const updateSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).max(10).optional(),
  active: z.boolean().optional(),
})

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('outbound_webhooks')
    .select('id, url, events, active, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  // Limit to 10 webhooks per user
  const { count } = await supabase
    .from('outbound_webhooks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Maximum 10 webhooks per account' }, { status: 422 })
  }

  const secret = crypto.randomBytes(24).toString('hex')

  const admin = createAdminClient()
  const { data: webhook, error } = await admin
    .from('outbound_webhooks')
    .insert({
      user_id: user!.id,
      url: parsed.data.url,
      events: parsed.data.events,
      active: parsed.data.active,
      secret,
    })
    .select()
    .single()

  if (error || !webhook) {
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }

  return NextResponse.json(webhook, { status: 201 })
}
