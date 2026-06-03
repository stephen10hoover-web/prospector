export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'
import { Resend } from 'resend'
import { sanitizeSubject } from '@/lib/sanitize'

type TargetSegment = 'all' | 'pro' | 'team' | 'free_trial' | 'active' | 'canceled'

interface BroadcastBody {
  subject: string
  html: string
  target: TargetSegment
  /** Phase 1: preview=true returns recipient list without sending */
  preview?: boolean
  confirmation?: string  // must equal 'SEND BROADCAST' when not preview
}

async function getTargetEmails(target: TargetSegment): Promise<string[]> {
  const admin = createAdminClient()
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 5000 })
  const allUsers = authData?.users ?? []

  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id, plan, status')

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]))

  return allUsers
    .filter((u) => {
      if (!u.email) return false
      const sub = subMap.get(u.id)
      const plan = sub?.plan ?? 'free_trial'
      const status = sub?.status ?? 'trialing'
      if (target === 'all') return true
      if (target === 'pro') return plan === 'pro' && status === 'active'
      if (target === 'team') return plan === 'team' && status === 'active'
      if (target === 'free_trial') return plan === 'free_trial'
      if (target === 'active') return status === 'active'
      if (target === 'canceled') return status === 'canceled'
      return false
    })
    .map((u) => u.email!)
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({})) as BroadcastBody

  const subject = sanitizeSubject(String(body.subject ?? '').trim())
  if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  if (!body.html?.trim()) return NextResponse.json({ error: 'html is required' }, { status: 400 })
  if (!body.target) return NextResponse.json({ error: 'target is required' }, { status: 400 })

  const emails = await getTargetEmails(body.target)

  // Phase 1: preview — return recipients without sending
  if (body.preview) {
    return NextResponse.json({
      preview: true,
      recipient_count: emails.length,
      sample: emails.slice(0, 5),
    })
  }

  // Phase 2: actual send
  if (body.confirmation !== 'SEND BROADCAST') {
    return NextResponse.json({ error: 'Type "SEND BROADCAST" to confirm' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email sending not configured' }, { status: 503 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_SYSTEM_FROM_EMAIL ?? 'noreply@prospectorsearches.com'

  let sent = 0
  let failed = 0
  const BATCH_SIZE = 50
  const BATCH_DELAY_MS = 200

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((to) =>
        resend.emails
          .send({ from: FROM, to, subject, html: body.html })
          .then(() => { sent++ })
          .catch(() => { failed++ })
      )
    )
    if (i + BATCH_SIZE < emails.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  await auditAdminAction({
    adminEmail: auth.user.email!,
    action: 'admin.broadcast.sent',
    metadata: { subject, target: body.target, total: emails.length, sent, failed },
    ip: auth.ip,
  })

  return NextResponse.json({ success: true, sent, failed, total: emails.length })
}
