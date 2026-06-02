import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

// Static changelog entries — add new entries at the top
const CHANGELOG = [
  {
    id: 'v1.5',
    date: '2026-06-01',
    title: 'Workspaces & Team Collaboration',
    items: [
      'Invite teammates to shared workspaces',
      'Role-based access: owner, admin, member',
      'Manage members directly from Settings → Team',
    ],
  },
  {
    id: 'v1.4',
    date: '2026-05-15',
    title: 'Proposals & Booking Links',
    items: [
      'Generate professional proposals for leads',
      'Public proposal view with tracking',
      'Add your booking link for direct scheduling',
    ],
  },
  {
    id: 'v1.3',
    date: '2026-05-01',
    title: 'A/B Testing & Analytics',
    items: [
      'Test two subject lines or email bodies per sequence step',
      'View open rate and click rate per variant',
      'Richer analytics dashboard with conversion metrics',
    ],
  },
  {
    id: 'v1.2',
    date: '2026-04-15',
    title: 'CSV Import & Export',
    items: [
      'Import leads from any CSV file',
      'Export your full leads list as CSV',
      'Bulk operations on imported contacts',
    ],
  },
]

const LATEST_ID = CHANGELOG[0].id

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('last_seen_changelog')
    .eq('user_id', user.id)
    .single()

  const lastSeen = data?.last_seen_changelog as string | null
  const hasNew = lastSeen !== LATEST_ID

  return NextResponse.json({ changelog: CHANGELOG, hasNew, latestId: LATEST_ID })
}

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  await admin
    .from('user_profiles')
    .upsert({ user_id: user.id, last_seen_changelog: LATEST_ID }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}
