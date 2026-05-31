export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { isUUID } from '@/lib/validate'

export async function GET(
  request: NextRequest,
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
    if (!isUUID(id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: outreachLogs } = await supabase
      .from('outreach_logs')
      .select('*')
      .eq('business_id', id)
      .eq('user_id', user!.id)
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
