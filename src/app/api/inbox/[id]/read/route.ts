export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('inbound_messages')
    .update({ read: true })
    .eq('business_id', params.id)
    .eq('user_id', session.user.id)

  return NextResponse.json({ ok: true })
}
