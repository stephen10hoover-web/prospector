export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendOutreachEmail } from '@/lib/resend'
import { atomicCheckAndIncrement, getUserPlan, getUserPlanStatus, periodForPlan } from '@/lib/usage'
import { PLAN_LIMITS } from '@/lib/plans'
import { createTrackingToken, buildTrackingPixelUrl } from '@/lib/email-tracking'
import { createAdminClient } from '@/lib/supabase-server'
import { isUUID } from '@/lib/validate'
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
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isUUID(params.id)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    // Atomic usage gate — single DB round-trip that checks AND increments together.
    // Prevents TOCTOU race where concurrent requests all read count=0 before any increment lands.
    const planStatus = await getUserPlanStatus(user!.id)
    const plan = planStatus.planId
    if (plan !== 'pro') {
      const emailLimit = PLAN_LIMITS[plan].emailLimit
      const period = periodForPlan(plan)
      const limitResult = await atomicCheckAndIncrement(user!.id, 'emails_sent_count', emailLimit, period)
      if (!limitResult.allowed) {
        return NextResponse.json(
          { error: `Monthly email limit reached. Upgrade to Pro for unlimited outreach.`, upgrade: true },
          { status: 402 }
        )
      }
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
      .eq('user_id', user!.id)
      .eq('email', to.toLowerCase())
      .maybeSingle()

    if (suppressed) {
      return NextResponse.json(
        { error: 'This email address has unsubscribed and cannot receive emails.' },
        { status: 422 }
      )
    }

    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', params.id)
      .eq('user_id', user!.id)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Pre-insert log so we can attach tracking token to it
    const admin = createAdminClient()
    const { data: logRow } = await admin
      .from('outreach_logs')
      .insert({
        business_id: params.id,
        user_id: user!.id,
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
          userId: user!.id,
        })
      : null

    const { data: senderProfile } = await adminDb
      .from('profiles')
      .select('full_name, company_name, mailing_address')
      .eq('id', user!.id)
      .maybeSingle()

    const result = await sendOutreachEmail({
      to,
      subject,
      body: emailBody,
      businessName: business.name,
      businessId: params.id,
      userId: user!.id,
      trackingPixelUrl: token ? buildTrackingPixelUrl(token) : undefined,
      senderName: senderProfile?.full_name ?? undefined,
      senderCompany: senderProfile?.company_name ?? undefined,
      senderAddress: senderProfile?.mailing_address ?? undefined,
    })

    await supabase
      .from('businesses')
      .update({ outreach_status: 'sent' })
      .eq('id', params.id)
      .eq('user_id', user!.id)

    return NextResponse.json({ success: true, messageId: result.id })
  } catch (error) {
    console.error('Send error:', error)

    try {
      const supabase = await createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from('outreach_logs').insert({
          business_id: params.id,
          user_id: user!.id,
          type: 'email',
          status: 'failed',
        })
      }
    } catch {
      // best-effort failure log
    }

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
