export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateSchema = z.object({
  body: z.string().min(1, 'Note cannot be empty').max(10000, 'Note too long'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id, noteId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: note, error } = await supabase
    .from('lead_notes')
    .update({ body: parsed.data.body })
    .eq('id', noteId)
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .select()
    .single()

  if (error || !note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  const admin = createAdminClient()
  await admin.from('lead_activities').insert({
    business_id: id,
    user_id: user!.id,
    type: 'note_updated',
    metadata: { note_id: noteId, preview: parsed.data.body.slice(0, 100) },
  }).then(null, () => null)

  return NextResponse.json(note)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id, noteId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', noteId)
    .eq('business_id', id)
    .eq('user_id', user!.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = createAdminClient()
  await admin.from('lead_activities').insert({
    business_id: id,
    user_id: user!.id,
    type: 'note_deleted',
    metadata: { note_id: noteId },
  }).then(null, () => null)

  return NextResponse.json({ ok: true })
}
