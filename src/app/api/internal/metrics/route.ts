export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { auditAdminAction } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase-server'
import { PLAN_META } from '@/lib/plans'

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const admin = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: subs },
    { data: recentSubs },
    { data: churnedSubs },
    { data: recentEvents },
  ] = await Promise.all([
    admin.from('subscriptions').select('plan, status, created_at, user_id'),
    admin.from('subscriptions').select('plan, created_at').gte('created_at', weekAgo),
    admin.from('subscriptions')
      .select('plan, updated_at')
      .eq('status', 'canceled')
      .gte('updated_at', monthStart),
    admin.from('audit_logs')
      .select('action, actor_email, severity, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const all = subs ?? []
  const totalUsers = all.length
  const byPlan = {
    free_trial: all.filter((s) => s.plan === 'free_trial').length,
    pro: all.filter((s) => s.plan === 'pro' && s.status === 'active').length,
    team: all.filter((s) => s.plan === 'team' && s.status === 'active').length,
  }

  const mrr =
    byPlan.pro * (PLAN_META.pro.price ?? 0) +
    byPlan.team * (PLAN_META.team.price ?? 0)

  const newThisWeek = (recentSubs ?? []).length
  const newToday = (recentSubs ?? []).filter(
    (s) => new Date(s.created_at) >= new Date(dayAgo)
  ).length
  const churnedThisMonth = (churnedSubs ?? []).length

  await auditAdminAction({
    adminEmail: auth.session.user.email!,
    action: 'admin.metrics.viewed',
    ip: auth.ip,
  })

  return NextResponse.json({
    totalUsers,
    byPlan,
    mrr: Math.round(mrr * 100) / 100,
    newToday,
    newThisWeek,
    churnedThisMonth,
    recentAuditEvents: recentEvents ?? [],
  })
}
