export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { searchBusinesses } from '@/lib/business-discovery'
import { analyzeWebsite } from '@/lib/website-analyzer'
import { calculateLeadScore } from '@/lib/scoring'
import { qualifyLead } from '@/lib/claude'
import { findBusinessEmail } from '@/lib/email-finder'
import { checkSearchLimit, incrementUsage } from '@/lib/usage'
import { z } from 'zod'

const searchSchema = z.object({
  category: z.string().min(1, 'Category is required').max(100),
  location: z.string().min(1, 'Location is required').max(200),
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

    // Usage gate
    const limitCheck = await checkSearchLimit(session.user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, upgrade: true, current: limitCheck.current, limit: limitCheck.limit },
        { status: 402 }
      )
    }

    const { category, location, radius } = parsed.data
    const adminClient = createAdminClient()

    // Create search record immediately and return — process in background
    const { data: search, error: searchError } = await adminClient
      .from('searches')
      .insert({
        user_id: session.user.id,
        category,
        location,
        radius,
        result_count: 0,
        status: 'processing',
      })
      .select()
      .single()

    if (searchError || !search) {
      return NextResponse.json({ error: 'Failed to create search record' }, { status: 500 })
    }

    // Increment usage count immediately (reserve the slot)
    await incrementUsage(session.user.id, 'searches_count')

    // Process in background — response returns immediately
    waitUntil(processSearch(search.id, session.user.id, { category, location, radius }))

    return NextResponse.json({ searchId: search.id, status: 'processing' })
  } catch (error) {
    console.error('Search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processSearch(
  searchId: string,
  userId: string,
  params: { category: string; location: string; radius: number }
) {
  const adminClient = createAdminClient()

  try {
    const rawBusinesses = await searchBusinesses(params)

    const enriched = await Promise.all(
      rawBusinesses.map(async (biz) => {
        const [websiteAnalysis, emailResult] = await Promise.all([
          analyzeWebsite(biz.website_url),
          findBusinessEmail(biz.website_url),
        ])

        const leadScore = calculateLeadScore({
          ...biz,
          has_website: websiteAnalysis.hasWebsite,
          website_quality_score: websiteAnalysis.qualityScore,
        })

        // Non-blocking AI qualification — run independently per lead
        let aiReasoning: string | null = null
        try {
          const qualification = await qualifyLead({
            ...biz,
            has_website: websiteAnalysis.hasWebsite,
            website_quality_score: websiteAnalysis.qualityScore,
          })
          aiReasoning = qualification.reasoning
        } catch {
          // AI qualification failure never blocks the pipeline
        }

        return {
          search_id: searchId,
          user_id: userId,
          name: biz.name,
          category: biz.category,
          address: biz.address,
          city: biz.city,
          state: biz.state,
          phone: biz.phone,
          email: emailResult?.email ?? null,
          email_source: emailResult?.source ?? null,
          email_confidence: emailResult?.confidence ?? null,
          website_url: biz.website_url,
          google_maps_url: biz.google_maps_url,
          review_count: biz.review_count,
          rating: biz.rating,
          has_website: websiteAnalysis.hasWebsite,
          website_quality_score: websiteAnalysis.qualityScore,
          website_issues: websiteAnalysis.issues,
          lead_score: leadScore,
          outreach_status: 'not_contacted',
          ai_score_reasoning: aiReasoning,
        }
      })
    )

    // Insert with dedup — skip rows that violate the unique constraint (user_id, name, city, state)
    const { data: inserted, error: insertError } = await adminClient
      .from('businesses')
      .upsert(enriched, { onConflict: 'user_id,name,city,state', ignoreDuplicates: true })
      .select('id')

    let finalCount = 0
    if (insertError) {
      // If bulk upsert fails for any reason, insert individually
      let count = 0
      for (const biz of enriched) {
        const { error } = await adminClient.from('businesses').insert(biz)
        if (!error) count++
      }
      finalCount = count
    } else {
      finalCount = inserted?.length ?? enriched.length
    }

    await adminClient
      .from('searches')
      .update({ status: 'completed', result_count: finalCount })
      .eq('id', searchId)
  } catch (error) {
    console.error('Background search processing error:', error)
    await adminClient
      .from('searches')
      .update({ status: 'failed' })
      .eq('id', searchId)
  }
}
