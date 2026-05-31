export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email().max(254),
  uid: z.string().uuid(),
  token: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid unsubscribe link.' }, { status: 400 })
    }

    const { email, uid, token } = parsed.data

    const valid = await verifyUnsubscribeToken(email, uid, token)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link.' }, { status: 403 })
    }

    const supabase = createAdminClient()
    await supabase
      .from('email_suppressions')
      .upsert(
        { user_id: uid, email: email.toLowerCase() },
        { onConflict: 'user_id,email' }
      )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to unsubscribe.' }, { status: 500 })
  }
}
