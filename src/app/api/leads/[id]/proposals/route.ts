export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { fireWebhooks } from '@/lib/webhooks'

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  included: z.boolean().default(true),
})

const packageSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0).max(1_000_000),
  billing: z.enum(['one_time', 'monthly', 'quarterly']),
  features: z.array(z.string().max(200)).max(20).default([]),
  recommended: z.boolean().default(false),
})

const contentSchema = z.object({
  intro: z.string().max(2000).default(''),
  services: z.array(serviceSchema).max(20).default([]),
  packages: z.array(packageSchema).max(5).default([]),
  about: z.string().max(2000).default(''),
  next_steps: z.string().max(1000).default(''),
})

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: contentSchema,
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('proposals')
    .select('*')
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify business ownership
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: proposal, error } = await admin
    .from('proposals')
    .insert({
      business_id: id,
      user_id: user!.id,
      title: parsed.data.title,
      content: parsed.data.content,
      status: 'draft',
    })
    .select()
    .single()

  if (error || !proposal) {
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 })
  }

  // Log activity
  await admin.from('lead_activities').insert({
    business_id: id,
    user_id: user!.id,
    type: 'proposal_sent',
    metadata: { proposal_id: proposal.id, title: parsed.data.title },
  }).then(null, () => null)

  // Fire webhook
  fireWebhooks(user!.id, 'proposal_sent', {
    business_id: id,
    business_name: biz.name,
    proposal_id: proposal.id,
    proposal_title: parsed.data.title,
  }).then(null, () => null)

  return NextResponse.json(proposal, { status: 201 })
}
