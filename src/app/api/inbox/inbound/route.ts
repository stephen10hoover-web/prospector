export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Constant-time string comparison — prevents timing-based secret enumeration
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

// Parse "Name <email>" or bare "email" format
function parseFrom(raw: string): { email: string; name: string | null } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() }
  }
  return { email: raw.trim().toLowerCase(), name: null }
}

// Parse reply-to token: replies+{businessId}x{userId}@prospectorsearches.com
// UUIDs are hex+hyphens only — 'x' cannot appear in a UUID, so it's a safe delimiter
function parseReplyToken(toAddresses: string[]): { businessId: string; userId: string } | null {
  for (const addr of toAddresses) {
    const { email } = parseFrom(addr)
    const m = email.match(/^replies\+([0-9a-f-]{36})x([0-9a-f-]{36})@/i)
    if (m) return { businessId: m[1], userId: m[2] }
  }
  return null
}

// Strip quoted reply chains — stop at first "> " quoted line or common separators
function extractNewContent(text: string): string {
  const lines = text.split('\n')
  const kept: string[] = []
  for (const line of lines) {
    if (line.startsWith('>')) break
    if (/^-{3,}\s*original message\s*-{3,}/i.test(line)) break
    if (/^on .+ wrote:$/i.test(line.trim())) break
    kept.push(line)
  }
  return kept.join('\n').trim()
}

export async function POST(request: NextRequest) {
  // Verify webhook secret via Authorization header (not query param — avoids logging in CDN/proxy access logs)
  const authHeader = request.headers.get('authorization') ?? ''
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!process.env.INBOUND_WEBHOOK_SECRET || !timingSafeEqual(secret, process.env.INBOUND_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const { from, to, subject, text, headers: emailHeaders } = payload as {
      from: string
      to: string | string[]
      subject?: string
      text?: string
      headers?: Record<string, string>
    }

    if (!from || !to) {
      return NextResponse.json({ ok: true }) // silently ignore malformed
    }

    const toAddresses = Array.isArray(to) ? to : [to]
    const routing = parseReplyToken(toAddresses)
    if (!routing) {
      return NextResponse.json({ ok: true }) // not a tracked reply
    }

    const { businessId, userId } = routing
    const { email: fromEmail, name: fromName } = parseFrom(from)
    const rawBody = text ?? ''
    const body = extractNewContent(rawBody) || rawBody.trim().slice(0, 5000)

    if (!body) {
      return NextResponse.json({ ok: true }) // empty reply — ignore
    }

    // Use message-id header for deduplication if available
    const messageId = emailHeaders?.['message-id'] ?? emailHeaders?.['Message-ID'] ?? null

    const supabase = createAdminClient()

    // Confirm business belongs to this user (prevents spoofed tokens)
    const { data: business } = await supabase
      .from('businesses')
      .select('id, pipeline_stage')
      .eq('id', businessId)
      .eq('user_id', userId)
      .single()

    if (!business) {
      return NextResponse.json({ ok: true }) // silently ignore invalid routing
    }

    // Dedup: skip if we already have a message with this message-id
    if (messageId) {
      const { count } = await supabase
        .from('inbound_messages')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('message_id', messageId)

      if ((count ?? 0) > 0) {
        return NextResponse.json({ ok: true }) // duplicate — idempotent
      }
    }

    await supabase.from('inbound_messages').insert({
      business_id: businessId,
      user_id: userId,
      from_email: fromEmail,
      from_name: fromName ?? null,
      subject: subject ?? null,
      body,
      message_id: messageId,
      read: false,
    })

    // Mark lead as replied and update pipeline stage if not already past 'replied'
    const earlyStages = ['new_lead', 'contacted', 'follow_up']
    const updates: Record<string, string> = { outreach_status: 'replied' }
    if (earlyStages.includes(business.pipeline_stage as string)) {
      updates.pipeline_stage = 'replied'
    }

    await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .eq('user_id', userId)

    // Immediately stop all active sequence enrollments for this lead
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'replied', completed_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .eq('status', 'active')

    // Log activity for the reply received event
    await supabase.from('lead_activities').insert({
      business_id: businessId,
      user_id: userId,
      type: 'reply_received',
      metadata: {
        from_email: fromEmail,
        from_name: fromName,
        subject: subject ?? null,
        preview: body.slice(0, 200),
      },
    }).then(null, () => null) // non-fatal — table may not exist yet

    // Fire outbound webhooks for lead_replied event (non-blocking)
    void supabase
      .from('outbound_webhooks')
      .select('id, url, secret')
      .eq('user_id', userId)
      .eq('active', true)
      .contains('events', ['lead_replied'])
      .then(({ data: hooks }) => {
        if (!hooks?.length) return
        const payload = {
          event: 'lead_replied',
          business_id: businessId,
          from_email: fromEmail,
          subject: subject ?? null,
          timestamp: new Date().toISOString(),
        }
        for (const hook of hooks) {
          deliverWebhook(hook.id, hook.url, hook.secret, payload, supabase).then(null, () => null)
        }
      })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[inbound] webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deliverWebhook(webhookId: string, url: string, secret: string | null, payload: Record<string, unknown>, supabase: any) {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) {
    // Simple HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    headers['X-Prospector-Signature'] = Buffer.from(sig).toString('hex')
  }

  let status = 0
  let responseBody = ''
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
    status = res.status
    responseBody = (await res.text()).slice(0, 500)
  } catch (err) {
    responseBody = err instanceof Error ? err.message : String(err)
  }

  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhookId,
    event: payload.event,
    payload,
    status_code: status,
    response_body: responseBody,
    success: status >= 200 && status < 300,
  }).then(null, () => null)
}
