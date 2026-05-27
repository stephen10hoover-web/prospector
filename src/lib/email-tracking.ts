import { createAdminClient } from './supabase-server'

// Known machine/proxy user-agent patterns — Apple MPP, Google Image Proxy, etc.
const MACHINE_UA_PATTERNS = [
  'Apple Privacy Proxy',
  'Apple-Mail',
  'GoogleImageProxy',
  'Yahoo! Mail Proxy',
  'YahooMailProxy',
  'Thunderbird',
  'Outlook',
  'bot',
  'crawler',
  'spider',
]

export function detectMachineOpen(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 15) return true
  const lower = ua.toLowerCase()
  return MACHINE_UA_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

export async function createTrackingToken(params: {
  outreachLogId: string | null
  businessId: string
  userId: string
  enrollmentId?: string | null
  stepNumber?: number | null
}): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('email_tracking_tokens')
    .insert({
      outreach_log_id: params.outreachLogId,
      business_id: params.businessId,
      user_id: params.userId,
      sequence_enrollment_id: params.enrollmentId ?? null,
      step_number: params.stepNumber ?? null,
    })
    .select('token')
    .single()
  return data?.token ?? ''
}

export function buildTrackingPixelUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/api/track/open/${token}`
}

export async function recordOpenEvent(
  token: string,
  userAgent: string | null | undefined
): Promise<void> {
  const supabase = createAdminClient()

  const { data: tokenData } = await supabase
    .from('email_tracking_tokens')
    .select('id, outreach_log_id, business_id, user_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenData) return

  const isMachine = detectMachineOpen(userAgent)

  await supabase.from('email_open_events').insert({
    token_id: tokenData.id,
    user_agent: userAgent ? (userAgent as string).slice(0, 500) : null,
    is_machine_open: isMachine,
  })

  // Only update open metrics for real (non-machine) opens
  if (!isMachine && tokenData.outreach_log_id) {
    const { data: log } = await supabase
      .from('outreach_logs')
      .select('open_count, first_opened_at')
      .eq('id', tokenData.outreach_log_id)
      .maybeSingle()

    if (log) {
      await supabase
        .from('outreach_logs')
        .update({
          open_count: ((log.open_count as number) ?? 0) + 1,
          first_opened_at: log.first_opened_at ?? new Date().toISOString(),
        })
        .eq('id', tokenData.outreach_log_id)
    }
  }
}
