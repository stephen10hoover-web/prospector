export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Server-side sign-out — clears the session cookie.
// Clients should call this on logout rather than relying solely on client-side signOut.
export async function POST() {
  try {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  } catch {
    // Sign-out errors should not block the user from being logged out in the client
    return NextResponse.json({ ok: true })
  }
}
