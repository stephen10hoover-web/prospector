export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: search, error } = await supabase
      .from('searches')
      .select('id, status, result_count')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single()

    if (error || !search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: search.status ?? 'completed',
      result_count: search.result_count ?? 0,
    })
  } catch (error) {
    console.error('Search status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}