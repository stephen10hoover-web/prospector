export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import type { AdminNoteBody } from '@/types/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('user_admin_notes')
    .select('id, admin_email, body, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json().catch(() => ({})) as AdminNoteBody

  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'Note body is required' }, { status: 400 })
  }
  if (body.body.length > 2000) {
    return NextResponse.json({ error: 'Note must be under 2000 characters' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_admin_notes')
    .insert({ user_id: id, admin_email: auth.user.email!, body: body.body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('note_id')
  if (!noteId) return NextResponse.json({ error: 'note_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_admin_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  return NextResponse.json({ success: true })
}
