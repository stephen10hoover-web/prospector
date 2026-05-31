export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const profileSchema = z.object({
  full_name: z.string().max(100).optional(),
  company_name: z.string().max(100).optional(),
  mailing_address: z.string().max(300).optional(),
})

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('full_name, company_name, mailing_address')
    .eq('id', user!.id)
    .maybeSingle()

  return NextResponse.json(data ?? {})
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
