export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { auditAdminAction } from '@/lib/audit'
import type { PlanId } from '@/lib/plans'

type BulkAction = 'suspend' | 'unsuspend' | 'override_plan' | 'extend_trial'

interface BulkRequest {
  action: BulkAction
  user_ids: string[]
  reason: string
  confirmation: string  // must equal 'CONFIRM'
  // action-specific params
  plan?: PlanId
  days?: number
}

/**
 * POST /api/internal/users/bulk
 * Returns NDJSON stream — one JSON object per line:
 *   { id, status: 'ok' | 'error', message? }
 *   final line: { done: true, succeeded: number, failed: number }
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({})) as BulkRequest

  if (body.confirmation !== 'CONFIRM') {
    return new Response(JSON.stringify({ error: 'Type CONFIRM to proceed with bulk action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userIds: string[] = body.user_ids ?? []
  if (!userIds.length || userIds.length > 500) {
    return new Response(JSON.stringify({ error: 'user_ids must be 1–500 items' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!body.reason?.trim()) {
    return new Response(JSON.stringify({ error: 'reason is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const admin = createAdminClient()
  let succeeded = 0
  let failed = 0

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()

      function send(obj: Record<string, unknown>) {
        controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))
      }

      for (const userId of userIds) {
        try {
          if (body.action === 'suspend') {
            await admin.from('user_profiles').upsert({
              id: userId,
              is_suspended: true,
              suspended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          } else if (body.action === 'unsuspend') {
            await admin.from('user_profiles').update({
              is_suspended: false,
              suspended_at: null,
              suspended_until: null,
              updated_at: new Date().toISOString(),
            }).eq('id', userId)
          } else if (body.action === 'override_plan' && body.plan) {
            await admin.from('subscriptions').upsert(
              { user_id: userId, plan: body.plan, status: 'active', updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            )
          } else if (body.action === 'extend_trial' && body.days) {
            const { data: sub } = await admin.from('subscriptions').select('trial_ends_at, plan').eq('user_id', userId).single()
            const base = sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date() ? new Date(sub.trial_ends_at) : new Date()
            const newEnd = new Date(base.getTime() + body.days * 86400000)
            await admin.from('subscriptions').upsert(
              { user_id: userId, plan: sub?.plan ?? 'free_trial', trial_ends_at: newEnd.toISOString(), updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            )
          }
          succeeded++
          send({ id: userId, status: 'ok' })
        } catch (err) {
          failed++
          send({ id: userId, status: 'error', message: (err as Error).message })
        }
      }

      await auditAdminAction({
        adminEmail: auth.user.email!,
        action: `admin.bulk.${body.action}`,
        metadata: { total: userIds.length, succeeded, failed, reason: body.reason },
        ip: auth.ip,
      })

      send({ done: true, succeeded, failed })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
