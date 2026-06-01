export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('workspace_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 })
  }

  // Add user to workspace
  const { error: memberError } = await admin
    .from('workspace_members')
    .upsert(
      { workspace_id: invite.workspace_id, user_id: user!.id, role: invite.role, invited_by: invite.invited_by },
      { onConflict: 'workspace_id,user_id', ignoreDuplicates: true }
    )

  if (memberError) {
    return NextResponse.json({ error: 'Failed to join workspace' }, { status: 500 })
  }

  // Mark invite accepted
  await admin
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .then(null, () => null)

  return NextResponse.json({ workspace_id: invite.workspace_id, ok: true })
}
