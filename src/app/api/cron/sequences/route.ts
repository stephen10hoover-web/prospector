export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { processSequences } from '@/lib/sequences'

// Called by Vercel Cron — verify via CRON_SECRET header
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processSequences()
  return NextResponse.json({ ok: true, ...result })
}

// Also allow authenticated manual trigger (for dashboard background processing)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  const result = await processSequences(userId ?? undefined)
  return NextResponse.json({ ok: true, ...result })
}
