import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('onboarding_progress')
    .select('completed_steps, dismissed_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    completedSteps: (data?.completed_steps as string[]) ?? [],
    dismissed: !!data?.dismissed_at,
  })
}

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  if (body.dismiss) {
    await admin
      .from('onboarding_progress')
      .upsert({ user_id: user.id, dismissed_at: new Date().toISOString() }, { onConflict: 'user_id' })
    return NextResponse.json({ ok: true })
  }

  if (body.step) {
    // Fetch current steps and add the new one
    const { data } = await admin
      .from('onboarding_progress')
      .select('completed_steps')
      .eq('user_id', user.id)
      .single()
    const existing = (data?.completed_steps as string[]) ?? []
    if (!existing.includes(body.step)) {
      existing.push(body.step)
    }
    await admin
      .from('onboarding_progress')
      .upsert({ user_id: user.id, completed_steps: existing }, { onConflict: 'user_id' })
    return NextResponse.json({ completedSteps: existing })
  }

  return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
}
