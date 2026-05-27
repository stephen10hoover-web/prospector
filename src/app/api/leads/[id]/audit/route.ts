export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getOrCreateAudit } from '@/lib/audit-generator'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: report } = await supabase
    .from('audit_reports')
    .select('content, share_token, generated_at')
    .eq('business_id', params.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!report) return NextResponse.json({ report: null })
  return NextResponse.json({ report })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await getOrCreateAudit(params.id, session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Audit generation error:', err)
    return NextResponse.json({ error: 'Failed to generate audit report' }, { status: 500 })
  }
}
