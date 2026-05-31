export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user?.id
  const admin = createAdminClient()

  const [searches, businesses, outreachLogs, profile] = await Promise.all([
    admin.from('searches').select('*').eq('user_id', userId),
    admin.from('businesses').select('*').eq('user_id', userId),
    admin.from('outreach_logs').select('*').eq('user_id', userId),
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile.data ?? {},
    searches: searches.data ?? [],
    businesses: businesses.data ?? [],
    outreach_logs: outreachLogs.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="prospector-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
