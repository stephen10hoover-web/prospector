export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: outreachLogs } = await supabase
      .from('outreach_logs')
      .select('*')
      .eq('business_id', params.id)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      business,
      outreachLogs: outreachLogs ?? [],
    })
  } catch (error) {
    console.error('Lead fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
