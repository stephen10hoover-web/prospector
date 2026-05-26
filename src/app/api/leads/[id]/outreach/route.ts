import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateOutreachEmail } from '@/lib/claude'
import type { Business } from '@/types'

export async function POST(
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

    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const outreach = await generateOutreachEmail(business as Business)

    await supabase.from('ai_generations').insert({
      business_id: params.id,
      user_id: session.user.id,
      type: 'outreach_email',
      input: {
        businessName: business.name,
        category: business.category,
        city: business.city,
        websiteScore: business.website_quality_score,
        reviewCount: business.review_count,
        rating: business.rating,
      },
      output: outreach,
      model: 'claude-sonnet-4-6',
    })

    await supabase.from('outreach_logs').insert({
      business_id: params.id,
      user_id: session.user.id,
      type: 'generated',
      subject: outreach.subject,
      body: outreach.body,
      status: 'generated',
    })

    await supabase
      .from('businesses')
      .update({ outreach_status: 'generated' })
      .eq('id', params.id)

    return NextResponse.json(outreach)
  } catch (error) {
    console.error('Outreach generation error:', error)
    return NextResponse.json({ error: 'Failed to generate outreach' }, { status: 500 })
  }
}
