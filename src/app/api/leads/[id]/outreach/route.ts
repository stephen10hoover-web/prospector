export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateOutreachEmail } from '@/lib/claude'
import { checkOutreachGenerationLimit, incrementUsage } from '@/lib/usage'
import { isUUID } from '@/lib/validate'
import type { Business } from '@/types'

export async function POST(
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

    // Gate AI generation — prevents free users from draining Claude API credits
    const limitCheck = await checkOutreachGenerationLimit(user!.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, upgrade: true },
        { status: 402 }
      )
    }

    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const outreach = await generateOutreachEmail(business as Business)

    await supabase.from('ai_generations').insert({
      business_id: id,
      user_id: user!.id,
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
      business_id: id,
      user_id: user!.id,
      type: 'generated',
      subject: outreach.subject,
      body: outreach.body,
      status: 'generated',
    })

    await supabase
      .from('businesses')
      .update({ outreach_status: 'generated' })
      .eq('id', id)

    await incrementUsage(user!.id, 'outreach_generated_count')

    return NextResponse.json(outreach)
  } catch (error) {
    console.error('Outreach generation error:', error)
    return NextResponse.json({ error: 'Failed to generate outreach' }, { status: 500 })
  }
}
