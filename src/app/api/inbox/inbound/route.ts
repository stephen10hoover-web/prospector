export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

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
  // Verify webhook secret passed as ?secret= query param
  const secret = request.nextUrl.searchParams.get('secret')
  if (!process.env.INBOUND_WEBHOOK_SECRET || secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const { from, to, subject, text } = payload as {
      from: string
      to: string | string[]
      subject?: string
      text?: string
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

    const supabase = createAdminClient()

    // Confirm business belongs to this user (prevents spoofed tokens)
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', userId)
      .single()

    if (!business) {
      return NextResponse.json({ ok: true }) // silently ignore invalid routing
    }

    await supabase.from('inbound_messages').insert({
      business_id: businessId,
      user_id: userId,
      from_email: fromEmail,
      from_name: fromName ?? null,
      subject: subject ?? null,
      body,
      read: false,
    })

    // Mark lead as replied
    await supabase
      .from('businesses')
      .update({ outreach_status: 'replied' })
      .eq('id', businessId)
      .eq('user_id', userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[inbound] webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
