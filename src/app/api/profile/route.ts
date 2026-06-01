export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const profileSchema = z.object({
  full_name: z.string().max(100).optional(),
  company_name: z.string().max(100).optional(),
  mailing_address: z.string().max(300).optional(),
  booking_link: z.string().url().max(500).optional().nullable().or(z.literal('')).transform((v) => v === '' ? null : v),
})

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: profile }, { data: userProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, company_name, mailing_address, booking_link')
      .eq('id', user!.id)
      .maybeSingle(),
    admin
      .from('user_profiles')
      .select('sending_email, physical_address')
      .eq('id', user!.id)
      .maybeSingle(),
  ])

  return NextResponse.json({
    ...(profile ?? {}),
    sending_email: userProfile?.sending_email ?? null,
    physical_address: userProfile?.physical_address ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user!.id, ...parsed.data, updated_at: new Date().toISOString() })

  if (error) {
    console.error('[profile] upsert error:', error.message)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Alias PUT to PATCH for backward compatibility
export { PATCH as PUT }
