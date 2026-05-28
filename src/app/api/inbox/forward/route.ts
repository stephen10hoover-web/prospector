export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FORWARD_TO = process.env.ROLE_FORWARD_EMAIL ?? 'siteforgerelations@gmail.com'
const WEBHOOK_SECRET = process.env.FORWARD_WEBHOOK_SECRET

function getResendClient() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: NextRequest) {
  // Verify shared secret so only Resend can trigger this endpoint
  if (WEBHOOK_SECRET) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const payload = await request.json()
    const { from, to, subject, text, html } = payload as {
      from: string
      to: string | string[]
      subject?: string
      text?: string
      html?: string
    }

    const toAddress = (Array.isArray(to) ? to[0] : to) ?? ''
    const roleLabel = toAddress.split('@')[0] ?? 'forwarded'
    const resend = getResendClient()

    await resend.emails.send({
      // Send from the role address it arrived at (domain is already verified)
      from: toAddress || `noreply@prospectorsearches.com`,
      to: [FORWARD_TO],
      replyTo: from,
      subject: subject ? `[${roleLabel}] ${subject}` : `[${roleLabel}] (no subject)`,
      html: html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${text ?? ''}</pre>`,
      text: text ?? '',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forward] Failed to forward role email:', err)
    return NextResponse.json({ error: 'Failed to forward' }, { status: 500 })
  }
}
