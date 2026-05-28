export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

export async function GET() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('sending_email, display_name, physical_address')
    .eq('id', session.user.id)
    .maybeSingle()

  return NextResponse.json({
    email: session.user.email ?? null,
    sending_email: profile?.sending_email ?? null,
    display_name: profile?.display_name ?? null,
    physical_address: profile?.physical_address ?? null,
  })
}

const updateSchema = z.object({
  display_name: z.string().max(100).optional().nullable(),
  physical_address: z.string().max(500).optional().nullable(),
})

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_profiles')
    .upsert({ id: session.user.id, ...parsed.data }, { onConflict: 'id' })

  if (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
