export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership of webhook
  const { data: webhook } = await supabase
    .from('outbound_webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('user_id', user!.id)
    .single()

  if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('webhook_deliveries')
    .select('id, event, status_code, success, created_at')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}
