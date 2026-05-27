export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const stepSchema = z.object({
  step_number: z.number().int().min(1),
  delay_days: z.number().int().min(0).max(90),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  steps: z.array(stepSchema).min(1).max(10),
})

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: sequences }, { data: enrollmentCounts }] = await Promise.all([
    admin
      .from('sequences')
      .select('*, sequence_steps(id, step_number, delay_days, subject)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    admin
      .from('sequence_enrollments')
      .select('sequence_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active'),
  ])

  const countMap: Record<string, number> = {}
  for (const e of enrollmentCounts ?? []) {
    const sid = e.sequence_id as string
    countMap[sid] = (countMap[sid] ?? 0) + 1
  }

  const enriched = (sequences ?? []).map((s) => ({
    ...s,
    active_enrollments: countMap[s.id] ?? 0,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, description, steps } = parsed.data
  const admin = createAdminClient()

  const { data: sequence, error: seqError } = await admin
    .from('sequences')
    .insert({ user_id: session.user.id, name, description: description ?? null })
    .select()
    .single()

  if (seqError || !sequence) {
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 })
  }

  const stepRows = steps.map((s) => ({ ...s, sequence_id: sequence.id }))
  const { error: stepsError } = await admin.from('sequence_steps').insert(stepRows)

  if (stepsError) {
    await admin.from('sequences').delete().eq('id', sequence.id)
    return NextResponse.json({ error: 'Failed to create steps' }, { status: 500 })
  }

  return NextResponse.json(sequence, { status: 201 })
}
