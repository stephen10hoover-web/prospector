export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

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
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const { error } = await supabase
    .from('businesses')
    .update({ pipeline_stage: parsed.data.stage })
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
