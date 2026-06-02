import { NextRequest, NextResponse } from 'next/server'

// Constant-time string comparison — prevents timing-based secret enumeration.
// Extracted here so every cron route uses the same vetted implementation.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

/**
 * Verifies the incoming request carries a valid CRON_SECRET bearer token.
 *
 * Returns null if the request is authorized, or a ready-to-return NextResponse
 * if it should be rejected (503 if secret not configured, 401 if wrong secret).
 * Usage:
 *   const authError = verifyCronSecret(request)
 *   if (authError) return authError
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  if (!process.env.CRON_SECRET) {
    console.error('[cron] CRON_SECRET is not set. Refusing to run cron job.')
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization') ?? ''
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (!timingSafeEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
