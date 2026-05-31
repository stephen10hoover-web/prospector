export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const city = searchParams.get('city')
    const status = searchParams.get('status')
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')
    const searchId = searchParams.get('search_id')

    let query = supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user?.id)
      .order('lead_score', { ascending: false })

    if (searchId) query = query.eq('search_id', searchId)
    if (category) query = query.ilike('category', `%${category}%`)
    if (city) query = query.ilike('city', `%${city}%`)
    if (status) query = query.eq('outreach_status', status)

    // Parse score filters safely — parseInt can return NaN for non-numeric input
    if (minScore) {
      const min = parseInt(minScore, 10)
      if (!isNaN(min)) query = query.gte('lead_score', Math.max(0, Math.min(100, min)))
    }
    if (maxScore) {
      const max = parseInt(maxScore, 10)
      if (!isNaN(max)) query = query.lte('lead_score', Math.max(0, Math.min(100, max)))
    }

    const { data, error } = await query.limit(200)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({ leads: data ?? [] })
  } catch (error) {
    console.error('Leads fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
