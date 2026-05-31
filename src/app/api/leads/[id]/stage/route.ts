export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { isUUID } from '@/lib/validate'

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
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUUID(params.id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const { error } = await supabase
    .from('businesses')
    .update({ pipeline_stage: parsed.data.stage })
    .eq('id', params.id)
    .eq('user_id', user!.id)

  if (error) {
    console.error('[stage] update error:', error.message)
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
