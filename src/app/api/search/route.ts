export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchBusinesses } from '@/lib/business-discovery'
import { analyzeWebsite } from '@/lib/website-analyzer'
import { calculateLeadScore } from '@/lib/scoring'
import { z } from 'zod'

const searchSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required'),
  radius: z.number().int().min(1).max(100).default(20),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = searchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { category, location, radius } = parsed.data

    const rawBusinesses = await searchBusinesses({ category, location, radius })

    const { data: search, error: searchError } = await supabase
      .from('searches')
      .insert({
        user_id: session.user.id,
        category,
        location,
        radius,
        result_count: rawBusinesses.length,
      })
      .select()
      .single()

    if (searchError || !search) {
      return NextResponse.json({ error: 'Failed to create search record' }, { status: 500 })
    }

    const enrichedBusinesses = await Promise.all(
      rawBusinesses.map(async (biz) => {
        const websiteAnalysis = await analyzeWebsite(biz.website_url)
        const leadScore = calculateLeadScore({
          ...biz,
          has_website: websiteAnalysis.hasWebsite,
          website_quality_score: websiteAnalysis.qualityScore,
        })

        return {
          search_id: search.id,
          user_id: session.user.id,
          name: biz.name,
          category: biz.category,
          address: biz.address,
          city: biz.city,
          state: biz.state,
          phone: biz.phone,
          email: null,
          website_url: biz.website_url,
          google_maps_url: biz.google_maps_url,
          review_count: biz.review_count,
          rating: biz.rating,
          has_website: websiteAnalysis.hasWebsite,
          website_quality_score: websiteAnalysis.qualityScore,
          website_issues: websiteAnalysis.issues,
          lead_score: leadScore,
          outreach_status: 'not_contacted',
          ai_score_reasoning: null,
        }
      })
    )

    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .insert(enrichedBusinesses)
      .select()

    if (bizError) {
      return NextResponse.json({ error: 'Failed to save businesses' }, { status: 500 })
    }

    await supabase
      .from('searches')
      .update({ result_count: businesses?.length ?? 0 })
      .eq('id', search.id)

    return NextResponse.json({
      searchId: search.id,
      businesses: businesses ?? [],
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
