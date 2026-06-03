import { requireSuperAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase-server'
import { PLAN_META } from '@/lib/plans'
import Link from 'next/link'
import { Users, DollarSign, TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import type { PlanId } from '@/lib/plans'

async function getMetrics() {
  const admin = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
  const last24h = dayAgo

  const [
    { data: subs },
    { data: churnedSubs },
    { data: recentAudit },
    { count: failedPayments },
    { count: trialsExpiring },
    { count: criticalEvents },
  ] = await Promise.all([
    admin.from('subscriptions').select('plan, status, created_at, user_id, trial_ends_at'),
    admin.from('subscriptions')
      .select('plan, updated_at')
      .eq('status', 'canceled')
      .gte('updated_at', monthStart),
    admin.from('audit_logs')
      .select('action, actor_email, severity, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10),
    admin.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'past_due'),
    admin.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free_trial')
      .lte('trial_ends_at', in48h)
      .gte('trial_ends_at', now.toISOString()),
    admin.from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .gte('created_at', last24h),
  ])

  const all = subs ?? []
  const proActive  = all.filter((s) => s.plan === 'pro'  && s.status === 'active').length
  const teamActive = all.filter((s) => s.plan === 'team' && s.status === 'active').length
  const trials     = all.filter((s) => s.plan === 'free_trial').length
  const mrr        = proActive * (PLAN_META.pro.price ?? 0) + teamActive * (PLAN_META.team.price ?? 0)
  const newToday   = all.filter((s) => new Date(s.created_at) >= new Date(dayAgo)).length
  const newWeek    = all.filter((s) => new Date(s.created_at) >= new Date(weekAgo)).length

  return {
    totalUsers: all.length,
    proActive,
    teamActive,
    trials,
    mrr: Math.round(mrr * 100) / 100,
    churnedThisMonth: (churnedSubs ?? []).length,
    newToday,
    newWeek,
    recentAudit: recentAudit ?? [],
    failedPayments: failedPayments ?? 0,
    trialsExpiring: trialsExpiring ?? 0,
    criticalEvents: criticalEvents ?? 0,
  }
}

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-widest font-medium">{label}</p>
        <Icon className={`h-4 w-4 ${accent ?? 'text-white/30'}`} />
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  )
}

const SEVERITY_COLORS: Record<string, string> = {
  info:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warning:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
}

export default async function AdminOverviewPage() {
  await requireSuperAdmin('admin_overview')
  const m = await getMetrics()

  interface AttentionItem {
    type: string
    count: number
    label: string
    description: string
    cta: string
    href: string
    color: string
    icon: React.ElementType
    iconColor: string
  }

  const attentionItems: AttentionItem[] = [
    m.failedPayments > 0 ? {
      type: 'failed_payments',
      count: m.failedPayments,
      label: `${m.failedPayments} Failed Payment${m.failedPayments !== 1 ? 's' : ''}`,
      description: 'These users have active subscriptions with declined cards. Revenue at risk until resolved.',
      cta: 'Review users',
      href: '/internal/core/ops/console/users?status=past_due',
      color: 'border-red-500/30 bg-red-500/10',
      icon: TrendingDown,
      iconColor: 'text-red-400',
    } : null,
    m.trialsExpiring > 0 ? {
      type: 'trials_expiring',
      count: m.trialsExpiring,
      label: `${m.trialsExpiring} Trial${m.trialsExpiring !== 1 ? 's' : ''} Expiring Soon`,
      description: 'These trials end within 48 hours. Users with high engagement are strong conversion candidates.',
      cta: 'View trial users',
      href: '/internal/core/ops/console/users?plan=free_trial',
      color: 'border-yellow-500/30 bg-yellow-500/10',
      icon: Clock,
      iconColor: 'text-yellow-400',
    } : null,
    m.criticalEvents > 0 ? {
      type: 'critical_events',
      count: m.criticalEvents,
      label: `${m.criticalEvents} Critical Event${m.criticalEvents !== 1 ? 's' : ''}`,
      description: 'Security or system events flagged in the last 24 hours that require manual review.',
      cta: 'Open audit log',
      href: '/internal/core/ops/console/audit?severity=critical',
      color: 'border-red-500/30 bg-red-500/10',
      icon: AlertTriangle,
      iconColor: 'text-red-400',
    } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Needs Attention widget */}
      {attentionItems.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-300">
            Nothing needs your attention right now. All payments are current, no trials are at risk, and no critical events have been flagged.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attentionItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.type} className={`flex items-center gap-4 px-5 py-3.5 border rounded-xl ${item.color}`}>
                <Icon className={`h-4 w-4 shrink-0 ${item.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                </div>
                <Link
                  href={item.href}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors shrink-0"
                >
                  {item.cta} →
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"   value={m.totalUsers.toLocaleString()} sub={`+${m.newToday} today · +${m.newWeek} this week`} icon={Users} accent="text-blue-400" />
        <StatCard label="MRR"           value={`$${m.mrr.toLocaleString()}`}  sub={`${m.proActive} Pro · ${m.teamActive} Team`}       icon={DollarSign} accent="text-green-400" />
        <StatCard label="Active Trials" value={m.trials}                       sub="Free trial users"                                   icon={Clock} accent="text-yellow-400" />
        <StatCard label="Churn / Month" value={m.churnedThisMonth}             sub="Canceled this month"                               icon={TrendingDown} accent="text-red-400" />
      </div>

      {/* Plan breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-widest">Plan Distribution</h2>
        <div className="space-y-3">
          {(
            [
              { planId: 'free_trial' as PlanId, count: m.trials,     color: 'bg-yellow-400' },
              { planId: 'pro'        as PlanId, count: m.proActive,  color: 'bg-blue-400' },
              { planId: 'team'       as PlanId, count: m.teamActive, color: 'bg-purple-400' },
            ]
          ).map(({ planId, count, color }) => {
            const pct = m.totalUsers > 0 ? Math.round((count / m.totalUsers) * 100) : 0
            return (
              <div key={planId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/70">{PLAN_META[planId].name}</span>
                  <span className="text-white/50 tabular-nums">{count} <span className="text-white/30">({pct}%)</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent audit events */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Recent Audit Events</h2>
          <Link href="/internal/core/ops/console/audit" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {m.recentAudit.length === 0 ? (
            <p className="px-5 py-6 text-sm text-white/30 text-center">No audit events yet</p>
          ) : (
            m.recentAudit.map((event, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.info}`}>
                  {event.severity}
                </span>
                <span className="text-sm text-white/80 font-mono flex-1 truncate">{event.action}</span>
                <span className="text-xs text-white/30 shrink-0 truncate max-w-[160px]">{event.actor_email}</span>
                <span className="text-xs text-white/20 shrink-0">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
