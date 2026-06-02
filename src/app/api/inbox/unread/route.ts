export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })

  const admin = createAdminClient()
  const { count } = await admin
    .from('inbound_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return NextResponse.json({ count: count ?? 0 })
}
