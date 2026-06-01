export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify sequence ownership
  const { data: seq } = await supabase
    .from('sequences')
    .select('id, name, sequence_steps(step_number, subject, subject_b)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!seq) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: rawResults } = await admin
    .from('sequence_ab_results')
    .select('step_number, variant, opened, replied')
    .eq('sequence_id', id)

  // Aggregate by step_number + variant
  const agg: Record<string, Record<'A' | 'B', { sent: number; opened: number; replied: number }>> = {}

  for (const r of rawResults ?? []) {
    const step = String(r.step_number)
    const v = r.variant as 'A' | 'B'
    if (!agg[step]) agg[step] = { A: { sent: 0, opened: 0, replied: 0 }, B: { sent: 0, opened: 0, replied: 0 } }
    agg[step][v].sent++
    if (r.opened) agg[step][v].opened++
    if (r.replied) agg[step][v].replied++
  }

  const steps = (seq.sequence_steps as { step_number: number; subject: string; subject_b: string | null }[])
    .sort((a, b) => a.step_number - b.step_number)

  const results = steps
    .filter((s) => s.subject_b) // only steps with A/B test
    .map((s) => {
      const step = String(s.step_number)
      const a = agg[step]?.A ?? { sent: 0, opened: 0, replied: 0 }
      const b = agg[step]?.B ?? { sent: 0, opened: 0, replied: 0 }
      return {
        step_number: s.step_number,
        subject_a: s.subject,
        subject_b: s.subject_b,
        a: { ...a, openRate: a.sent > 0 ? Math.round((a.opened / a.sent) * 100) : 0, replyRate: a.sent > 0 ? Math.round((a.replied / a.sent) * 100) : 0 },
        b: { ...b, openRate: b.sent > 0 ? Math.round((b.opened / b.sent) * 100) : 0, replyRate: b.sent > 0 ? Math.round((b.replied / b.sent) * 100) : 0 },
      }
    })

  return NextResponse.json({ sequence: seq, results })
}
