export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { fireWebhooks } from '@/lib/webhooks'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, user_id, business_id, view_count, viewed_at, status')
    .eq('share_token', token)
    .single()

  if (!proposal) return NextResponse.json({ ok: true }) // silently ignore

  const isFirstView = !proposal.viewed_at
  const updates: Record<string, unknown> = {
    view_count: ((proposal.view_count as number) ?? 0) + 1,
  }
  if (isFirstView) {
    updates.viewed_at = new Date().toISOString()
    updates.status = 'viewed'
  }

  await supabase
    .from('proposals')
    .update(updates)
    .eq('id', proposal.id)

  if (isFirstView) {
    // Log activity
    await supabase.from('lead_activities').insert({
      business_id: proposal.business_id,
      user_id: proposal.user_id,
      type: 'proposal_viewed',
      metadata: { proposal_id: proposal.id },
    }).then(null, () => null)

    // Fire webhook
    fireWebhooks(proposal.user_id as string, 'proposal_viewed', {
      proposal_id: proposal.id,
      business_id: proposal.business_id,
    }).then(null, () => null)
  }

  return NextResponse.json({ ok: true })
}
