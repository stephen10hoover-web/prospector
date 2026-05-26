export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { searchBusinesses } from '@/lib/business-discovery'
import { analyzeWebsite } from '@/lib/website-analyzer'
import { calculateLeadScore } from '@/lib/scoring'
import { z } from 'zod'

const searchSchema = z.object({
  category: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  radius: z.number().int().min(1).max(100).default(20),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = searchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { category, location, radius } = parsed.data
    const adminClient = createAdminClient()

    const { data: search, error: searchError } = await adminClient
      .from('searches')
      .insert({ user_id: session.user.id, category, location, radius, result_count: 0, status: 'processing' })
      .select()
      .single()

    if (searchError || !search) {
      console.error('Search insert error:', searchError)
      return NextResponse.json({ error: 'Failed to create search' }, { status: 500 })
    }

    // Process synchronously
    try {
      const rawBusinesses = await searchBusinesses({ category, location, radius })
      console.log('[search] Got businesses:', rawBusinesses.length)

      const enriched = await Promise.all(
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

      const { error: insertError } = await adminClient.from('businesses').insert(enriched)
      if (insertError) console.error('[search] Insert error:', insertError)

      const finalCount = enriched.length
      await adminClient.from('searches').update({ status: 'completed', result_count: finalCount }).eq('id', search.id)

      return NextResponse.json({ searchId: search.id, status: 'completed', count: finalCount })
    } catch (procError) {
      console.error('[search] Processing error:', procError)
      await adminClient.from('searches').update({ status: 'failed' }).eq('id', search.id)
      return NextResponse.json({ error: 'Search processing failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}