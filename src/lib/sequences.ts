import { createAdminClient } from './supabase-server'
import { sendOutreachEmail } from './resend'
import { createTrackingToken, buildTrackingPixelUrl } from './email-tracking'

const BATCH_SIZE = 50

interface ProcessResult {
  processed: number
  failed: number
  skipped: number
}

// Called by cron or dashboard background trigger
export async function processSequences(userId?: string): Promise<ProcessResult> {
  const supabase = createAdminClient()
  const result: ProcessResult = { processed: 0, failed: 0, skipped: 0 }

  let query = supabase
    .from('sequence_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_send_at', new Date().toISOString())
    .limit(BATCH_SIZE)

  if (userId) query = query.eq('user_id', userId)

  const { data: enrollments, error } = await query
  if (error || !enrollments?.length) return result

  // Cache user profiles to avoid redundant DB calls per enrollment
  const profileCache = new Map<string, { sending_email: string | null; physical_address: string | null }>()

  for (const enrollment of enrollments) {
    try {
      const uid = enrollment.user_id as string
      if (!profileCache.has(uid)) {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('sending_email, physical_address')
          .eq('id', uid)
          .maybeSingle()
        profileCache.set(uid, {
          sending_email: prof?.sending_email ?? null,
          physical_address: prof?.physical_address ?? null,
        })
      }
      const outcome = await processEnrollment(enrollment, supabase, profileCache.get(uid)!)
      if (outcome === 'sent') result.processed++
      else result.skipped++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[seq] enrollment ${enrollment.id} error: ${msg}`)
      result.failed++
    }
  }

  return result
}

async function processEnrollment(
  enrollment: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profile: { sending_email: string | null; physical_address: string | null }
): Promise<'sent' | 'skipped' | 'stopped'> {
  const enrollmentId = enrollment.id as string
  const businessId = enrollment.business_id as string
  const userId = enrollment.user_id as string
  const currentStep = enrollment.current_step as number
  const sequenceId = enrollment.sequence_id as string

  // Stop if business replied
  const { count: replyCount } = await supabase
    .from('inbound_messages')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('user_id', userId)

  if (replyCount && replyCount > 0) {
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'replied', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    return 'stopped'
  }

  // Idempotency: skip if this step was already sent
  const { data: existingLog } = await supabase
    .from('sequence_email_logs')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('step_number', currentStep)
    .maybeSingle()

  if (existingLog) {
    await advanceEnrollment(enrollmentId, currentStep, sequenceId, supabase)
    return 'skipped'
  }

  // Get current step template
  const { data: step } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .eq('step_number', currentStep)
    .maybeSingle()

  if (!step) {
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    return 'stopped'
  }

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category, city, state, email')
    .eq('id', businessId)
    .maybeSingle()

  if (!business?.email) return 'skipped'

  const subject = substituteVars(step.subject as string, business)
  const body = substituteVars(step.body as string, business)

  // Pre-insert outreach_log to get ID for tracking token
  const { data: logRow } = await supabase
    .from('outreach_logs')
    .insert({
      business_id: businessId,
      user_id: userId,
      type: 'email',
      subject,
      body,
      sent_to: business.email,
      status: 'sent',
    })
    .select('id')
    .single()

  // Create tracking token linked to the log
  const token = logRow
    ? await createTrackingToken({
        outreachLogId: logRow.id,
        businessId: business.id,
        userId,
        enrollmentId,
        stepNumber: currentStep,
      })
    : null

  // Send
  await sendOutreachEmail({
    to: business.email,
    subject,
    body,
    businessName: business.name,
    businessId: business.id,
    userId,
    fromEmail: profile.sending_email,
    physicalAddress: profile.physical_address,
    trackingPixelUrl: token ? buildTrackingPixelUrl(token) : undefined,
  })

  // Record send (unique constraint prevents duplicates)
  await supabase.from('sequence_email_logs').insert({
    enrollment_id: enrollmentId,
    step_number: currentStep,
    to_email: business.email,
    subject,
  })

  await advanceEnrollment(enrollmentId, currentStep, sequenceId, supabase)
  return 'sent'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function advanceEnrollment(
  enrollmentId: string,
  currentStep: number,
  sequenceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<void> {
  const nextStep = currentStep + 1

  const { data: nextStepData } = await supabase
    .from('sequence_steps')
    .select('delay_days')
    .eq('sequence_id', sequenceId)
    .eq('step_number', nextStep)
    .maybeSingle()

  if (!nextStepData) {
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    return
  }

  const nextSendAt = new Date()
  nextSendAt.setDate(nextSendAt.getDate() + (nextStepData.delay_days as number))

  await supabase
    .from('sequence_enrollments')
    .update({ current_step: nextStep, next_send_at: nextSendAt.toISOString() })
    .eq('id', enrollmentId)
}

function substituteVars(template: string, business: Record<string, unknown>): string {
  return template
    .replace(/\{\{name\}\}/gi, (business.name as string) ?? '')
    .replace(/\{\{city\}\}/gi, (business.city as string) ?? '')
    .replace(/\{\{state\}\}/gi, (business.state as string) ?? '')
    .replace(/\{\{category\}\}/gi, (business.category as string) ?? '')
}
