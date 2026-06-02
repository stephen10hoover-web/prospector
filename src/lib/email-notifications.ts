// System notification emails — trial lifecycle, usage warnings, billing events.
// These are product emails FROM Prospector TO the user (not outreach emails).
// CAN-SPAM classification:
//   Transactional (no unsubscribe required): welcome, trial reminders, billing/subscription events
//   Commercial (unsubscribe required): usage warnings, win-back

import { Resend } from 'resend'
import { createAdminClient } from './supabase-server'
import { sanitizeSubject } from './sanitize'
import { PLAN_LIMITS, type PlanId } from './plans'
import { periodForPlan } from './usage'

// ─── Resend client ─────────────────────────────────────────────────────────────

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  return new Resend(process.env.RESEND_API_KEY)
}

const SYSTEM_FROM = process.env.RESEND_SYSTEM_FROM_EMAIL ?? 'noreply@prospectorsearches.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── System email HTML builder ────────────────────────────────────────────────
// Product-style email with Prospector branding. Separate from outreach emails.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

interface SystemEmailParams {
  heading: string
  body: string          // plain text, newlines become paragraphs
  ctaLabel?: string
  ctaUrl?: string
  unsubscribeUrl?: string  // only for commercial emails
}

function buildSystemEmailHtml(params: SystemEmailParams): string {
  const { heading, body, ctaLabel, ctaUrl, unsubscribeUrl } = params

  const bodyHtml = body
    .split('\n')
    .map((line) =>
      line.trim() === ''
        ? ''
        : `<p style="margin:0 0 14px 0;color:#374151;font-size:15px;line-height:1.6">${escapeHtml(line)}</p>`
    )
    .join('')

  const ctaBlock = ctaLabel && ctaUrl
    ? `<div style="margin:28px 0">
        <a href="${ctaUrl}" style="background:#0f172a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">${escapeHtml(ctaLabel)}</a>
      </div>`
    : ''

  const unsubBlock = unsubscribeUrl
    ? `<p style="margin-top:16px;font-size:12px;color:#9ca3af">
        Not interested?
        <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>
      </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
          <!-- Brand header -->
          <tr>
            <td style="background:#0f172a;padding:20px 40px">
              <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.3px">Prospector</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background:#ffffff;padding:40px">
              <h1 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3">${escapeHtml(heading)}</h1>
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
                You're receiving this because you have a Prospector account.<br/>
                ${unsubBlock}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Unsubscribe URL helper (commercial emails only) ──────────────────────────
// Lazy-loads the token module to avoid crashing if UNSUBSCRIBE_SECRET is not set
// (transactional emails don't need it).

async function buildUserUnsubscribeUrl(userId: string, userEmail: string): Promise<string> {
  const { signUnsubscribeToken, buildUnsubscribeUrl } = await import('./unsubscribe-token')
  const token = await signUnsubscribeToken(userEmail, userId)
  return buildUnsubscribeUrl(APP_URL, userEmail, userId, token)
}

// ─── Notification preference check ────────────────────────────────────────────

type PrefKey = 'trial_reminders' | 'usage_warnings' | 'subscription_events' | 'win_back'

async function isOptedIn(userId: string, key: PrefKey): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('notification_preferences')
    .select(key)
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return true // default: opted in (row may not exist yet)
  return (data as Record<string, boolean>)[key] !== false
}

// ─── Email log helper ─────────────────────────────────────────────────────────

async function logEmail(userId: string, emailType: string, metadata?: Record<string, unknown>): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('email_logs')
    .insert({ user_id: userId, email_type: emailType, metadata: metadata ?? null })
    .then(null, (err) => console.error('[email-notifications] log failed:', err))
}

// ─── Core send helper ─────────────────────────────────────────────────────────

async function sendNotification(
  to: string,
  subject: string,
  htmlParams: SystemEmailParams
): Promise<void> {
  const resend = getResend()
  const safeSubject = sanitizeSubject(subject)
  const html = buildSystemEmailHtml(htmlParams)
  const textBody = htmlParams.body + (htmlParams.ctaLabel && htmlParams.ctaUrl
    ? `\n\n${htmlParams.ctaLabel}: ${htmlParams.ctaUrl}`
    : '')
  const { error } = await resend.emails.send({
    from: SYSTEM_FROM,
    to: [to],
    subject: safeSubject,
    html,
    text: textBody,
    headers: htmlParams.unsubscribeUrl ? {
      'List-Unsubscribe': `<${htmlParams.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    } : undefined,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

// ─── Email 1: Welcome ─────────────────────────────────────────────────────────
// Transactional. Sent on signup via waitUntil.

export async function sendWelcomeEmail(userId: string, userEmail: string): Promise<void> {
  await sendNotification(userEmail, 'Welcome to Prospector — your 7-day trial starts now', {
    heading: 'Welcome to Prospector',
    body: [
      `Hi there,`,
      `Your free 7-day trial is active. Here's what you can do right now:`,
      `Search for local businesses in your niche, score them with AI, and send personalised outreach — all from one place.`,
      `Your leads, outreach history, and email sequences are saved even after your trial ends, so nothing is lost if you upgrade later.`,
      `Got questions? Just reply to this email.`,
    ].join('\n'),
    ctaLabel: 'Start Your First Search',
    ctaUrl: `${APP_URL}/search`,
  })
  await logEmail(userId, 'welcome')

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 2: Trial reminder — 3 days left ─────────────────────────────────────
// Transactional.

export async function sendTrialReminder3d(
  userId: string,
  userEmail: string,
  trialEndsAt: Date
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'trial_reminders')
  if (!optedIn) return

  const dateStr = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  await sendNotification(userEmail, 'Your Prospector trial ends in 3 days', {
    heading: 'Your trial ends in 3 days',
    body: [
      `Just a heads-up: your free trial ends on ${dateStr}.`,
      `After that, you'll lose access to your full lead list, outreach sequences, and all the emails you've sent.`,
      `Upgrading takes 30 seconds — and everything you've built stays exactly where you left it.`,
    ].join('\n'),
    ctaLabel: 'Keep My Leads — Upgrade Now',
    ctaUrl: `${APP_URL}/pricing`,
  })
  await logEmail(userId, 'trial_reminder_3d')

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ trial_reminder_3d_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 3: Trial reminder — 1 day left ─────────────────────────────────────
// Transactional.

export async function sendTrialReminder1d(
  userId: string,
  userEmail: string,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'trial_reminders')
  if (!optedIn) return

  await sendNotification(userEmail, 'Last day of your Prospector trial', {
    heading: 'Your trial ends tomorrow',
    body: [
      `This is your last day on the free trial.`,
      `Tomorrow your access to searches, sequences, and outreach tools will be restricted.`,
      `Don't lose the leads you've already found — upgrade before midnight and keep everything.`,
    ].join('\n'),
    ctaLabel: 'Upgrade Before It Expires',
    ctaUrl: `${APP_URL}/pricing`,
  })
  await logEmail(userId, 'trial_reminder_1d')

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ trial_reminder_1d_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 4: Trial expired ────────────────────────────────────────────────────
// Transactional.

export async function sendTrialExpiredEmail(
  userId: string,
  userEmail: string,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'trial_reminders')
  if (!optedIn) return

  await sendNotification(userEmail, 'Your Prospector trial has ended', {
    heading: 'Your trial has ended',
    body: [
      `Your 7-day trial is over, but your data isn't going anywhere.`,
      `All the leads you found, emails you sent, and sequences you built are saved — ready and waiting.`,
      `Upgrade now to get back in and keep finding clients.`,
    ].join('\n'),
    ctaLabel: 'Upgrade to Pro — $24.99/mo',
    ctaUrl: `${APP_URL}/pricing`,
  })
  await logEmail(userId, 'trial_expired')

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ trial_expired_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 5: Usage warning — 75% ─────────────────────────────────────────────
// Commercial — includes unsubscribe link.

export async function sendUsageWarning75(
  userId: string,
  userEmail: string,
  planId: PlanId,
  searchPct: number,
  emailPct: number,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'usage_warnings')
  if (!optedIn) return

  const limits = PLAN_LIMITS[planId]
  const period = limits.period === 'week' ? 'this week' : 'this month'
  const highResource = searchPct >= emailPct ? 'searches' : 'emails'
  const unsubscribeUrl = await buildUserUnsubscribeUrl(userId, userEmail)

  await sendNotification(userEmail, `You've used 75% of your ${highResource} — Prospector`, {
    heading: `You're 75% through your ${highResource}`,
    body: [
      `Just a heads-up: you've used 75% of your ${highResource} for ${period}.`,
      `You have ${Math.round(limits.searchLimit * 0.25)} searches and ${Math.round(limits.emailLimit * 0.25)} emails remaining before you hit the limit.`,
      `Upgrade before you run out to keep your outreach running without interruption.`,
    ].join('\n'),
    ctaLabel: 'Upgrade for More',
    ctaUrl: `${APP_URL}/pricing`,
    unsubscribeUrl,
  })
  await logEmail(userId, 'usage_warning_75', { searchPct, emailPct, planId })

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({
      usage_75_sent_at: new Date().toISOString(),
      usage_period: periodForPlan(planId),
    })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 6: Usage warning — 90% ─────────────────────────────────────────────
// Commercial — includes unsubscribe link.

export async function sendUsageWarning90(
  userId: string,
  userEmail: string,
  planId: PlanId,
  searchPct: number,
  emailPct: number,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'usage_warnings')
  if (!optedIn) return

  const limits = PLAN_LIMITS[planId]
  const period = limits.period === 'week' ? 'this week' : 'this month'
  const highResource = searchPct >= emailPct ? 'searches' : 'emails'
  const searchesLeft = Math.max(0, limits.searchLimit - Math.round(limits.searchLimit * (searchPct / 100)))
  const emailsLeft = Math.max(0, limits.emailLimit - Math.round(limits.emailLimit * (emailPct / 100)))
  const unsubscribeUrl = await buildUserUnsubscribeUrl(userId, userEmail)

  await sendNotification(userEmail, `Almost out of ${highResource} — Prospector`, {
    heading: `You're almost out of ${highResource}`,
    body: [
      `You've used 90% of your plan limits for ${period}.`,
      `${searchesLeft} searches and ${emailsLeft} emails left before you hit the cap.`,
      `Upgrade now to keep your pipeline moving without hitting a wall.`,
    ].join('\n'),
    ctaLabel: 'Upgrade Now',
    ctaUrl: `${APP_URL}/pricing`,
    unsubscribeUrl,
  })
  await logEmail(userId, 'usage_warning_90', { searchPct, emailPct, planId })

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({
      usage_90_sent_at: new Date().toISOString(),
      usage_period: periodForPlan(planId),
    })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 7: Payment failed (first) ──────────────────────────────────────────
// Transactional.

export async function sendPaymentFailed1(userId: string, userEmail: string): Promise<void> {
  const optedIn = await isOptedIn(userId, 'subscription_events')
  if (!optedIn) return

  await sendNotification(userEmail, 'Payment failed — action required', {
    heading: 'We couldn\'t process your payment',
    body: [
      `Your last payment didn't go through. This can happen when a card expires or has insufficient funds.`,
      `Update your payment method to keep your Prospector account active. If this isn't resolved within a few days, your account access may be restricted.`,
    ].join('\n'),
    ctaLabel: 'Update Payment Method',
    ctaUrl: `${APP_URL}/settings`,
  })
  await logEmail(userId, 'payment_failed_1')
}

// ─── Email 8: Payment failed (day 3 follow-up) ────────────────────────────────
// Transactional.

export async function sendPaymentFailed2(userId: string, userEmail: string): Promise<void> {
  const optedIn = await isOptedIn(userId, 'subscription_events')
  if (!optedIn) return

  await sendNotification(userEmail, 'Final notice: your Prospector payment is still failing', {
    heading: 'Final notice: payment still failing',
    body: [
      `We've tried charging your card again, but the payment is still failing.`,
      `Your account will be restricted soon if this isn't resolved. Update your payment method now to avoid losing access.`,
      `All your leads and sequences are safe — this is just a billing issue.`,
    ].join('\n'),
    ctaLabel: 'Fix Payment Now',
    ctaUrl: `${APP_URL}/settings`,
  })
  await logEmail(userId, 'payment_failed_2')
}

// ─── Email 9: Subscription canceled ───────────────────────────────────────────
// Transactional.

export async function sendSubscriptionCanceled(
  userId: string,
  userEmail: string,
  periodEnd: Date,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'subscription_events')
  if (!optedIn) return

  const dateStr = periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  await sendNotification(userEmail, 'Your Prospector subscription has been canceled', {
    heading: 'Subscription canceled',
    body: [
      `Your subscription has been canceled. You'll have full access until ${dateStr}.`,
      `After that date, your leads, sequences, and outreach history will still be saved — you just won't be able to run new searches or send emails.`,
      `Changed your mind? You can reactivate anytime before ${dateStr}.`,
    ].join('\n'),
    ctaLabel: 'Reactivate My Subscription',
    ctaUrl: `${APP_URL}/settings`,
  })
  await logEmail(userId, 'subscription_canceled', { period_end: periodEnd.toISOString() })
}

// ─── Email 10: Subscription reactivated ───────────────────────────────────────
// Transactional.

export async function sendSubscriptionReactivated(userId: string, userEmail: string): Promise<void> {
  const optedIn = await isOptedIn(userId, 'subscription_events')
  if (!optedIn) return

  await sendNotification(userEmail, 'Welcome back — your Prospector subscription is active', {
    heading: 'You\'re back!',
    body: [
      `Your subscription has been reactivated. Everything is exactly as you left it.`,
      `Your leads, sequences, and outreach history are all here, ready to pick up where you left off.`,
    ].join('\n'),
    ctaLabel: 'Go to Dashboard',
    ctaUrl: `${APP_URL}/dashboard`,
  })
  await logEmail(userId, 'subscription_reactivated')
}

// ─── Email 11: Upgraded ────────────────────────────────────────────────────────
// Transactional.

export async function sendUpgradeConfirmation(
  userId: string,
  userEmail: string,
  toPlan: PlanId,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'subscription_events')
  if (!optedIn) return

  const planName = toPlan === 'team' ? 'Team' : 'Pro'
  const limits = PLAN_LIMITS[toPlan]

  await sendNotification(userEmail, `You're now on Prospector ${planName}`, {
    heading: `Welcome to ${planName}`,
    body: [
      `Your upgrade is confirmed. Here's what you now have access to:`,
      `• ${limits.searchLimit} searches per month`,
      `• ${limits.emailLimit} emails per month`,
      `• ${limits.mileLimit}-mile search radius`,
      `Everything starts fresh with the new plan limits. Start finding clients.`,
    ].join('\n'),
    ctaLabel: 'Start Searching',
    ctaUrl: `${APP_URL}/search`,
  })
  await logEmail(userId, 'subscription_upgraded', { to_plan: toPlan })
}

// ─── Email 12: Downgraded ─────────────────────────────────────────────────────
// Transactional.

export async function sendDowngradeConfirmation(
  userId: string,
  userEmail: string,
  toPlan: PlanId,
): Promise<void> {
  const optedIn = await isOptedIn(userId, 'subscription_events')
  if (!optedIn) return

  const planName = toPlan === 'pro' ? 'Pro' : 'Free Trial'
  await sendNotification(userEmail, `Your Prospector plan has changed to ${planName}`, {
    heading: `Plan changed to ${planName}`,
    body: [
      `Your plan has been updated to ${planName}. The change takes effect at the start of your next billing period.`,
      `Your leads, sequences, and outreach history are all preserved.`,
      `If this was a mistake, you can upgrade again any time.`,
    ].join('\n'),
    ctaLabel: 'View Plans',
    ctaUrl: `${APP_URL}/pricing`,
  })
  await logEmail(userId, 'subscription_downgraded', { to_plan: toPlan })
}

// ─── Email 13: Win-back day 7 ─────────────────────────────────────────────────
// Commercial — includes unsubscribe link.

export async function sendWinBack7d(userId: string, userEmail: string): Promise<void> {
  const optedIn = await isOptedIn(userId, 'win_back')
  if (!optedIn) return

  const unsubscribeUrl = await buildUserUnsubscribeUrl(userId, userEmail)

  await sendNotification(userEmail, 'Your leads are still waiting — Prospector', {
    heading: 'Your leads are still waiting',
    body: [
      `It's been a week since your Prospector trial ended.`,
      `The businesses you found are still there. The outreach you drafted is still saved.`,
      `For $24.99/month you get 40 searches and 240 emails — enough to close a client within 30 days.`,
    ].join('\n'),
    ctaLabel: 'Come Back — Start at $24.99/mo',
    ctaUrl: `${APP_URL}/pricing`,
    unsubscribeUrl,
  })
  await logEmail(userId, 'win_back_7d')

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ win_back_7d_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Email 14: Win-back day 30 ────────────────────────────────────────────────
// Commercial — includes unsubscribe link.

export async function sendWinBack30d(userId: string, userEmail: string): Promise<void> {
  const optedIn = await isOptedIn(userId, 'win_back')
  if (!optedIn) return

  const unsubscribeUrl = await buildUserUnsubscribeUrl(userId, userEmail)

  await sendNotification(userEmail, "Still thinking about it? Here's 20% off — Prospector", {
    heading: "Still looking for clients?",
    body: [
      `It's been a month. If finding clients is still on your list, Prospector is still here.`,
      `Use code COMEBACK20 for 20% off your first month — valid for the next 72 hours.`,
      `Your leads and outreach history are still saved. Pick up exactly where you left off.`,
    ].join('\n'),
    ctaLabel: 'Claim Your Discount',
    ctaUrl: `${APP_URL}/pricing`,
    unsubscribeUrl,
  })
  await logEmail(userId, 'win_back_30d')

  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ win_back_30d_sent_at: new Date().toISOString() })
    .eq('user_id', userId)
    .then(null, () => null)
}

// ─── Cron orchestration ───────────────────────────────────────────────────────

export interface CronResult {
  trial: { processed: number; errors: number }
  usage: { processed: number; errors: number }
  paymentResend: { processed: number; errors: number }
}

/** Runs trial lifecycle email checks. Called from the hourly cron. */
export async function runTrialLifecycleCron(): Promise<{ processed: number; errors: number }> {
  const admin = createAdminClient()
  const { data: candidates, error } = await admin.rpc('get_trial_notification_candidates', { p_limit: 50 })
  if (error) {
    console.error('[cron/notifications] get_trial_notification_candidates failed:', error.message)
    return { processed: 0, errors: 1 }
  }

  let processed = 0
  let errors = 0

  for (const c of (candidates ?? [])) {
    const userId = c.user_id as string
    const email = c.email as string
    const trialEndsAt = c.trial_ends_at ? new Date(c.trial_ends_at as string) : null
    if (!email || !trialEndsAt) continue

    const now = new Date()
    const msToExpiry = trialEndsAt.getTime() - now.getTime()
    const hoursToExpiry = msToExpiry / (1000 * 60 * 60)

    try {
      // Expired (check first — widest condition)
      if (!c.trial_expired_sent_at && trialEndsAt <= now) {
        await sendTrialExpiredEmail(userId, email)
        processed++
        continue
      }
      // 1-day reminder (send before 3-day to avoid double-sending)
      if (!c.trial_reminder_1d_sent_at && hoursToExpiry <= 25 && hoursToExpiry > 0) {
        await sendTrialReminder1d(userId, email)
        processed++
        continue
      }
      // 3-day reminder
      if (!c.trial_reminder_3d_sent_at && hoursToExpiry <= 73 && hoursToExpiry > 0) {
        await sendTrialReminder3d(userId, email, trialEndsAt)
        processed++
        continue
      }
      // Win-back day 7 (7-8 days after expiry)
      const daysSinceExpiry = -msToExpiry / (1000 * 60 * 60 * 24)
      if (!c.win_back_7d_sent_at && daysSinceExpiry >= 7 && daysSinceExpiry < 8) {
        await sendWinBack7d(userId, email)
        processed++
        continue
      }
      // Win-back day 30
      if (!c.win_back_30d_sent_at && daysSinceExpiry >= 30 && daysSinceExpiry < 31) {
        await sendWinBack30d(userId, email)
        processed++
        continue
      }
    } catch (err) {
      console.error(`[cron/notifications] trial email failed for ${userId}:`, err)
      errors++
    }
  }

  return { processed, errors }
}

/** Runs usage warning checks for paid users. Called from the hourly cron. */
export async function runUsageWarningCron(): Promise<{ processed: number; errors: number }> {
  const admin = createAdminClient()

  // Pro/team users are on monthly periods; use current month
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: candidates, error } = await admin.rpc('get_usage_warning_candidates', {
    p_period: currentPeriod,
    p_limit: 50,
  })
  if (error) {
    console.error('[cron/notifications] get_usage_warning_candidates failed:', error.message)
    return { processed: 0, errors: 1 }
  }

  let processed = 0
  let errors = 0

  for (const c of (candidates ?? [])) {
    const userId = c.user_id as string
    const email = c.email as string
    const planId = c.plan as PlanId
    const limits = PLAN_LIMITS[planId]
    if (!email || !limits) continue

    const searches = c.searches_count as number
    const emails = c.emails_sent_count as number
    const searchPct = (searches / limits.searchLimit) * 100
    const emailPct = (emails / limits.emailLimit) * 100
    const periodChanged = (c.usage_period as string | null) !== currentPeriod

    // Reset sentinels when period rolls over
    if (periodChanged) {
      await admin
        .from('subscriptions')
        .update({ usage_75_sent_at: null, usage_90_sent_at: null, usage_period: currentPeriod })
        .eq('user_id', userId)
        .then(null, () => null)
      // Don't send email in the same pass — check next cron run
      continue
    }

    try {
      if (!c.usage_90_sent_at && (searchPct >= 90 || emailPct >= 90)) {
        await sendUsageWarning90(userId, email, planId, searchPct, emailPct)
        processed++
      } else if (!c.usage_75_sent_at && (searchPct >= 75 || emailPct >= 75)) {
        await sendUsageWarning75(userId, email, planId, searchPct, emailPct)
        processed++
      }
    } catch (err) {
      console.error(`[cron/notifications] usage warning failed for ${userId}:`, err)
      errors++
    }
  }

  return { processed, errors }
}

/** Sends payment-failed day-3 follow-ups. Called from the hourly cron. */
export async function runPaymentFailedResendCron(): Promise<{ processed: number; errors: number }> {
  const admin = createAdminClient()
  const { data: candidates, error } = await admin.rpc('get_payment_failed_resend_candidates', { p_limit: 50 })
  if (error) {
    console.error('[cron/notifications] get_payment_failed_resend_candidates failed:', error.message)
    return { processed: 0, errors: 1 }
  }

  let processed = 0
  let errors = 0

  for (const c of (candidates ?? [])) {
    try {
      await sendPaymentFailed2(c.user_id as string, c.email as string)
      processed++
    } catch (err) {
      console.error(`[cron/notifications] payment resend failed for ${c.user_id}:`, err)
      errors++
    }
  }

  return { processed, errors }
}
