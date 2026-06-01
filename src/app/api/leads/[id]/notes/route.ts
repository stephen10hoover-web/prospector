export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createSchema = z.object({
  body: z.string().min(1, 'Note cannot be empty').max(10000, 'Note too long'),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: notes, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(notes)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  // Verify ownership
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: note, error } = await supabase
    .from('lead_notes')
    .insert({
      business_id: id,
      user_id: user!.id,
      body: parsed.data.body,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  const admin = createAdminClient()
  await admin.from('lead_activities').insert({
    business_id: id,
    user_id: user!.id,
    type: 'note_added',
    metadata: { note_id: note.id, preview: parsed.data.body.slice(0, 100) },
  }).then(null, () => null)

  return NextResponse.json(note, { status: 201 })
}
