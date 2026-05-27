export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({ email: z.string().email().max(254) })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const { email } = parsed.data
    const supabase = createAdminClient()

    await supabase
      .from('email_suppressions')
      .upsert({ email: email.toLowerCase() }, { onConflict: 'email' })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
