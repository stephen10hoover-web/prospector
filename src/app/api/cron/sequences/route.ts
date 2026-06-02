export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { processSequences } from '@/lib/sequences'
import { verifyCronSecret } from '@/lib/cron-auth'

// Called by Vercel Cron — verify via CRON_SECRET header
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request)
  if (authError) return authError

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
