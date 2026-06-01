export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

const MAX_EXPORT = 10_000

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // Escape if contains comma, double-quote, newline, or leading = (formula injection)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || /^[=+\-@]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(',')
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const searchId = sp.get('search_id')
  const category = sp.get('category')
  const city = sp.get('city')
  const status = sp.get('status')
  const minScore = sp.get('minScore')
  const maxScore = sp.get('maxScore')
  const stage = sp.get('stage')

  // Fetch note counts per business via admin client
  const adminDb = createAdminClient()

  let query = supabase
    .from('businesses')
    .select('id, name, category, address, city, state, phone, email, email_source, email_confidence, website_url, lead_score, outreach_status, pipeline_stage, rating, review_count, created_at')
    .eq('user_id', user!.id)
    .order('lead_score', { ascending: false })
    .limit(MAX_EXPORT)

  if (searchId) query = query.eq('search_id', searchId)
  if (category) query = query.ilike('category', `%${category}%`)
  if (city) query = query.ilike('city', `%${city}%`)
  if (status) query = query.eq('outreach_status', status)
  if (minScore) query = query.gte('lead_score', parseInt(minScore))
  if (maxScore) query = query.lte('lead_score', parseInt(maxScore))
  if (stage) query = query.eq('pipeline_stage', stage)

  const { data: leads, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!leads?.length) {
    return new NextResponse('No leads to export', { status: 204 })
  }

  const businessIds = leads.map((l) => l.id as string)

  // Fetch note counts for all leads
  const { data: noteCounts } = await adminDb
    .from('lead_notes')
    .select('business_id')
    .in('business_id', businessIds)
    .eq('user_id', user!.id)

  const noteCountMap: Record<string, number> = {}
  for (const row of noteCounts ?? []) {
    noteCountMap[row.business_id as string] = (noteCountMap[row.business_id as string] ?? 0) + 1
  }

  // Fetch last activity date per lead
  const { data: lastActivity } = await adminDb
    .from('lead_activities')
    .select('business_id, created_at')
    .in('business_id', businessIds)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const lastActivityMap: Record<string, string> = {}
  for (const row of lastActivity ?? []) {
    const bid = row.business_id as string
    if (!lastActivityMap[bid]) lastActivityMap[bid] = row.created_at as string
  }

  // Build CSV
  const headers = [
    'Name', 'Category', 'Address', 'City', 'State',
    'Phone', 'Email', 'Email Source', 'Email Confidence %',
    'Website', 'Lead Score', 'Outreach Status', 'Pipeline Stage',
    'Rating', 'Reviews', 'Notes Count', 'Last Activity', 'Created',
  ]

  const rows = leads.map((lead) => [
    lead.name,
    lead.category,
    lead.address,
    lead.city,
    lead.state,
    lead.phone ?? '',
    lead.email ?? '',
    lead.email_source ?? '',
    lead.email_confidence ?? '',
    lead.website_url ?? '',
    lead.lead_score,
    lead.outreach_status,
    lead.pipeline_stage,
    lead.rating,
    lead.review_count,
    noteCountMap[lead.id as string] ?? 0,
    lastActivityMap[lead.id as string] ? new Date(lastActivityMap[lead.id as string]).toLocaleDateString() : '',
    new Date(lead.created_at as string).toLocaleDateString(),
  ])

  const csv = [toCsvRow(headers), ...rows.map(toCsvRow)].join('\r\n')

  const filename = `prospector-leads-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
