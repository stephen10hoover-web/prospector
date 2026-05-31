export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Explicitly verify the business belongs to the authenticated user before touching messages.
  // This is a defence-in-depth check on top of RLS — prevents IDOR if RLS is ever misconfigured.
  const admin = createAdminClient()
  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await admin
    .from('inbound_messages')
    .update({ read: true })
    .eq('business_id', id)
    .eq('user_id', user!.id)

  return NextResponse.json({ ok: true })
}
