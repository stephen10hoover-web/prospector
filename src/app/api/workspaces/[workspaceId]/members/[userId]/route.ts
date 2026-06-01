export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateSchema = z.object({
  role: z.enum(['admin', 'member']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  const { workspaceId, userId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: requester } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user!.id)
    .single()

  if (!requester || requester.role !== 'owner') {
    return NextResponse.json({ error: 'Only workspace owners can change roles' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: member, error } = await admin
    .from('workspace_members')
    .update({ role: parsed.data.role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  return NextResponse.json(member)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  const { workspaceId, userId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Owner can remove anyone; members can remove themselves
  const { data: requester } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user!.id)
    .single()

  if (!requester) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

  const isSelf = userId === user!.id
  const canRemove = requester.role === 'owner' || (requester.role === 'admin') || isSelf

  if (!canRemove) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  // Prevent removing the last owner
  if (userId !== user!.id) {
    const { data: target } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (target?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 422 })
    }
  }

  const { error } = await admin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
