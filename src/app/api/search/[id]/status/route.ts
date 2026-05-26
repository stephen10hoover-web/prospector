export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: search, error } = await supabase
    .from('searches')
    .select('id, status, result_count, category, location, created_at')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !search) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 })
  }

  return NextResponse.json(search)
}
