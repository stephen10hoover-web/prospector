export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const enrollSchema = z.object({
  sequenceId: z.string().uuid(),
  businessId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = enrollSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { sequenceId, businessId } = parsed.data
  const admin = createAdminClient()

  // Verify sequence belongs to user and has steps
  const { data: sequence } = await admin
    .from('sequences')
    .select('id, sequence_steps(step_number, delay_days, subject_b, body_b)')
    .eq('id', sequenceId)
    .eq('user_id', user?.id)
    .single()

  if (!sequence) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })

  const steps = sequence.sequence_steps as { step_number: number; delay_days: number; subject_b: string | null; body_b: string | null }[]
  if (!steps?.length) return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })

  // Verify business belongs to user
  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('user_id', user?.id)
    .single()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Randomly assign A/B variant — only relevant when at least one step has a B variant
  const hasAnyAbStep = steps.some((s) => s.subject_b && s.body_b)
  const abVariant: 'A' | 'B' = hasAnyAbStep && Math.random() < 0.5 ? 'B' : 'A'

  // Calculate first send time
  const firstStep = steps.sort((a, b) => a.step_number - b.step_number)[0]
  const nextSendAt = new Date()
  nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days)

  const { data: enrollment, error } = await admin
    .from('sequence_enrollments')
    .insert({
      sequence_id: sequenceId,
      business_id: businessId,
      user_id: user?.id,
      current_step: 1,
      status: 'active',
      ab_variant: abVariant,
      next_send_at: nextSendAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This lead is already enrolled in this sequence' }, { status: 409 })
    }
    console.error('[enroll] insert error:', error.message)
    return NextResponse.json({ error: 'Failed to enroll lead in sequence' }, { status: 500 })
  }

  // Log activity
  await admin.from('lead_activities').insert({
    business_id: businessId,
    user_id: user!.id,
    type: 'sequence_enrolled',
    metadata: {
      sequence_id: sequenceId,
      enrollment_id: enrollment.id,
      ab_variant: abVariant,
    },
  }).then(null, () => null)

  return NextResponse.json(enrollment, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { enrollmentId } = await request.json()
  if (!enrollmentId) return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 })

  const admin = createAdminClient()
  await admin
    .from('sequence_enrollments')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', enrollmentId)
    .eq('user_id', user?.id)

  return NextResponse.json({ ok: true })
}
