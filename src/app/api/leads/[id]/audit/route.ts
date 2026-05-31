export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getOrCreateAudit } from '@/lib/audit-generator'
import { atomicCheckAndIncrement, getUserPlan } from '@/lib/usage'
import { isUUID } from '@/lib/validate'

const FREE_AUDIT_LIMIT = 10

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUUID(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })

  const { data: report } = await supabase
    .from('audit_reports')
    .select('content, share_token, generated_at')
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!report) return NextResponse.json({ report: null })
  return NextResponse.json({ report })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const plan = await getUserPlan(user!.id)
    if (plan !== 'pro') {
      // Use dedicated audit counter — keeps audit and outreach generation limits independent
      const limitResult = await atomicCheckAndIncrement(
        user!.id,
        'audit_generated_count',
        FREE_AUDIT_LIMIT
      )
      if (!limitResult.allowed) {
        return NextResponse.json(
          { error: 'Monthly audit limit reached. Upgrade to Pro for unlimited audits.' },
          { status: 402 }
        )
      }
    }
    const result = await getOrCreateAudit(id, user!.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Audit generation error:', err)
    return NextResponse.json({ error: 'Failed to generate audit report' }, { status: 500 })
  }
}
