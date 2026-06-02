export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runTrialLifecycleCron, runUsageWarningCron, runPaymentFailedResendCron } from '@/lib/email-notifications'

// Hourly cron — processes all lifecycle notification emails.
// Registered in vercel.json as: { "path": "/api/cron/notifications", "schedule": "0 * * * *" }
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  try {
    const [trial, usage, paymentResend] = await Promise.all([
      runTrialLifecycleCron(),
      runUsageWarningCron(),
      runPaymentFailedResendCron(),
    ])

    return NextResponse.json({ ok: true, trial, usage, paymentResend })
  } catch (err) {
    console.error('[cron/notifications] unhandled error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
