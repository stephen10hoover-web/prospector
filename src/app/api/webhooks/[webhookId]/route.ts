export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { validateWebhookUrl } from '@/lib/webhook-validation'

const VALID_EVENTS = [
  'lead_replied',
  'proposal_sent',
  'proposal_viewed',
  'deal_won',
  'sequence_enrolled',
  'sequence_completed',
] as const

const safeUrl = z.string().url().max(500).superRefine((url, ctx) => {
  const err = validateWebhookUrl(url)
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err })
})

const updateSchema = z.object({
  url: safeUrl.optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).max(10).optional(),
  active: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: webhook, error } = await admin
    .from('outbound_webhooks')
    .update(parsed.data)
    .eq('id', webhookId)
    .eq('user_id', user!.id)
    .select()
    .single()

  if (error || !webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  return NextResponse.json(webhook)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('outbound_webhooks')
    .delete()
    .eq('id', webhookId)
    .eq('user_id', user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
