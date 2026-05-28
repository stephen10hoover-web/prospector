export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendOutreachEmail } from '@/lib/resend'
import { checkEmailLimit, incrementUsage } from '@/lib/usage'
import { createTrackingToken, buildTrackingPixelUrl } from '@/lib/email-tracking'
import { createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const sendSchema = z.object({
  to: z.string().email('Invalid email address').max(254),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Email body is required').max(10_000),
})

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

    // Usage gate
    const limitCheck = await checkEmailLimit(session.user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, upgrade: true, current: limitCheck.current, limit: limitCheck.limit },
        { status: 402 }
      )
    }

    const body = await request.json()
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { to, subject, body: emailBody } = parsed.data

    // Check suppression list before sending
    const adminDb = createAdminClient()
    const { data: suppressed } = await adminDb
      .from('email_suppressions')
      .select('email')
      .eq('email', to.toLowerCase())
      .maybeSingle()

    if (suppressed) {
      return NextResponse.json(
        { error: 'This email address has unsubscribed and cannot receive emails.' },
        { status: 422 }
      )
    }

    const [businessResult, profileResult] = await Promise.all([
      supabase
        .from('businesses')
        .select('name')
        .eq('id', params.id)
        .eq('user_id', session.user.id)
        .single(),
      adminDb
        .from('user_profiles')
        .select('sending_email, physical_address')
        .eq('id', session.user.id)
        .maybeSingle(),
    ])

    if (businessResult.error || !businessResult.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    const business = businessResult.data
    const profile = profileResult.data

    // Pre-insert log so we can attach tracking token to it
    const admin = createAdminClient()
    const { data: logRow } = await admin
      .from('outreach_logs')
      .insert({
        business_id: params.id,
        user_id: session.user.id,
        type: 'email',
        subject,
        body: emailBody,
        sent_to: to,
        status: 'sent',
      })
      .select('id')
      .single()

    const token = logRow
      ? await createTrackingToken({
          outreachLogId: logRow.id,
          businessId: params.id,
          userId: session.user.id,
        })
      : null

    const result = await sendOutreachEmail({
      to,
      subject,
      body: emailBody,
      businessName: business.name,
      businessId: params.id,
      userId: session.user.id,
      fromEmail: profile?.sending_email ?? null,
      physicalAddress: profile?.physical_address ?? null,
      trackingPixelUrl: token ? buildTrackingPixelUrl(token) : undefined,
    })

    await supabase
      .from('businesses')
      .update({ outreach_status: 'sent' })
      .eq('id', params.id)

    await incrementUsage(session.user.id, 'emails_sent_count')

    return NextResponse.json({ success: true, messageId: result.id })
  } catch (error) {
    console.error('Send error:', error)

    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      await supabase.from('outreach_logs').insert({
        business_id: params.id,
        user_id: session.user.id,
        type: 'email',
        status: 'failed',
      })
    }

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
