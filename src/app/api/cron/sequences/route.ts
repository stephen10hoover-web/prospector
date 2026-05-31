export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { processSequences } from '@/lib/sequences'

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

// Called by Vercel Cron — verify via CRON_SECRET header
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    // Misconfigured deployment — refuse to run rather than expose open cron endpoint
    console.error('[cron] CRON_SECRET is not set. Refusing to process sequences.')
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization') ?? ''
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!timingSafeEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processSequences()
  return NextResponse.json({ ok: true, ...result })
}

// Manual trigger — requires authenticated session, scoped to that user only
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processSequences(user?.id)
  return NextResponse.json({ ok: true, ...result })
}
