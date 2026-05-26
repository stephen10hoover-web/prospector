export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { analyzeWebsite } from '@/lib/website-analyzer'
import { calculateLeadScore } from '@/lib/scoring'

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

    const websiteAnalysis = await analyzeWebsite(business.website_url)
    const leadScore = calculateLeadScore({
      ...business,
      has_website: websiteAnalysis.hasWebsite,
      website_quality_score: websiteAnalysis.qualityScore,
    })

    const { data: updated, error: updateError } = await supabase
      .from('businesses')
      .update({
        has_website: websiteAnalysis.hasWebsite,
        website_quality_score: websiteAnalysis.qualityScore,
        website_issues: websiteAnalysis.issues,
        lead_score: leadScore,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
    }

    return NextResponse.json({
      business: updated,
      websiteAnalysis,
    })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
