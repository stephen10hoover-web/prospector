export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const addEmailSchema = z.object({
  type: z.literal('email'),
  email: z.string().email().max(300).transform((e) => e.toLowerCase().trim()),
  reason: z.string().max(200).optional().default('manual'),
})

const addDomainSchema = z.object({
  type: z.literal('domain'),
  domain: z
    .string()
    .max(200)
    .transform((d) => d.toLowerCase().trim().replace(/^@/, '')),
  reason: z.string().max(200).optional().default('manual'),
})

const addSchema = z.discriminatedUnion('type', [addEmailSchema, addDomainSchema])

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'email'

  const admin = createAdminClient()

  if (type === 'domain') {
    const { data } = await admin
      .from('domain_suppressions')
      .select('id, domain, reason, created_at')
      .eq('added_by', user!.id)
      .order('created_at', { ascending: false })
      .limit(500)
    return NextResponse.json(data ?? [])
  }

  // email suppressions are per-user
  const { data } = await admin
    .from('email_suppressions')
    .select('id, email, reason, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(1000)

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()

  if (parsed.data.type === 'domain') {
    const { data, error } = await admin
      .from('domain_suppressions')
      .upsert(
        { domain: parsed.data.domain, reason: parsed.data.reason, added_by: user!.id },
        { onConflict: 'domain', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add domain suppression' }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  }

  const { data, error } = await admin
    .from('email_suppressions')
    .upsert(
      { email: parsed.data.email, user_id: user!.id, reason: parsed.data.reason, added_by: user!.id },
      { onConflict: 'email,user_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to add email suppression' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
