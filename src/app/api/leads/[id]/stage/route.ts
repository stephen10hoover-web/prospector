export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { isUUID } from '@/lib/validate'
import { fireWebhooks } from '@/lib/webhooks'

const VALID_STAGES = [
  'new_lead', 'contacted', 'follow_up', 'replied',
  'discovery_call', 'proposal_sent', 'negotiation',
  'closed_won', 'closed_lost',
] as const

const schema = z.object({
  stage: z.enum(VALID_STAGES),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUUID(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const { data: biz } = await supabase
    .from('businesses')
    .select('pipeline_stage, name')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { error } = await supabase
    .from('businesses')
    .update({ pipeline_stage: parsed.data.stage })
    .eq('id', id)
    .eq('user_id', user!.id)

  if (error) {
    console.error('[stage] update error:', error.message)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }

  // Log activity
  const admin = createAdminClient()
  admin.from('lead_activities').insert({
    business_id: id,
    user_id: user!.id,
    type: 'stage_changed',
    metadata: { from: biz.pipeline_stage, to: parsed.data.stage },
  }).then(null, () => null)

  // Fire webhook for deal won
  if (parsed.data.stage === 'closed_won') {
    fireWebhooks(user!.id, 'deal_won', {
      business_id: id,
      business_name: biz.name,
      stage: 'closed_won',
    }).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}
