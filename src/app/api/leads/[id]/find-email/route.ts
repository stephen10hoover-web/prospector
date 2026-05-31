export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { findBusinessEmail } from '@/lib/email-finder'
import { atomicCheckAndIncrement, getUserPlan } from '@/lib/usage'

// Free users get 20 email lookups/month (shared with email sends).
// Pro users are unlimited. This prevents burning Hunter.io credits without a cap.
const FREE_EMAIL_FIND_LIMIT = 20

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUUID(params.id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id, website_url')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!business.website_url) {
    return NextResponse.json({ error: 'No website on file — cannot search for email.' }, { status: 422 })
  }

  // Gate Hunter.io calls — each lookup consumes API quota we pay for
  const plan = await getUserPlan(user!.id)
  if (plan !== 'pro') {
    const limitResult = await atomicCheckAndIncrement(user!.id, 'emails_sent_count', FREE_EMAIL_FIND_LIMIT)
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: 'Monthly email lookup limit reached. Upgrade to Pro for unlimited lookups.' },
        { status: 402 }
      )
    }
  }

  const result = await findBusinessEmail(business.website_url)

  if (!result) {
    return NextResponse.json({ error: 'No email found for this domain.' }, { status: 404 })
  }

  const admin = createAdminClient()
  await admin
    .from('businesses')
    .update({
      email: result.email,
      email_source: result.source,
      email_confidence: result.confidence,
    })
    .eq('id', params.id)
    .eq('user_id', user!.id)

  return NextResponse.json({ email: result.email, confidence: result.confidence, source: result.source })
}
