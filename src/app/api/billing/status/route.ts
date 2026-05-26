export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { getUsage } from '@/lib/usage'

export async function GET(_request: NextRequest) {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const [{ data: sub }, usage] = await Promise.all([
    adminClient
      .from('subscriptions')
      .select('plan, status, current_period_end, stripe_customer_id')
      .eq('user_id', session.user.id)
      .single(),
    getUsage(session.user.id),
  ])

  return NextResponse.json({
    plan: sub?.plan ?? 'free',
    status: sub?.status ?? 'active',
    current_period_end: sub?.current_period_end ?? null,
    stripe_customer_id: sub?.stripe_customer_id ?? null,
    usage,
  })
}
