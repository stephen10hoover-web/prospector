export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

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

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: contentSchema.optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined']).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const { id, proposalId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  return NextResponse.json(proposal)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const { id, proposalId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: proposal, error } = await supabase
    .from('proposals')
    .update(parsed.data)
    .eq('id', proposalId)
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .select()
    .single()

  if (error || !proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  return NextResponse.json(proposal)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalId: string }> }
) {
  const { id, proposalId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', proposalId)
    .eq('business_id', id)
    .eq('user_id', user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
