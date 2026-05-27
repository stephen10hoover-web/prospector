import { createServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Mail, MessageSquare, Users, Zap, Eye } from 'lucide-react'

function BarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((item) => {
        const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0
        return (
          <div key={item.label} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-muted-foreground font-medium">{item.value}</span>
            <div
              className="w-full rounded-t bg-primary/80 transition-all duration-300 min-h-[4px]"
              style={{ height: `${Math.max(4, pct)}%` }}
            />
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

function getWeekLabel(date: Date): string {
  const m = date.toLocaleString('default', { month: 'short' })
  const d = date.getDate()
  return `${m} ${d}`
}

export default async function AnalyticsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const [
    { data: sentLogs },
    { data: inbound },
    { data: businesses },
    { data: enrollments },
    { data: openedLogs },
  ] = await Promise.all([
    supabase
      .from('outreach_logs')
      .select('created_at')
      .eq('user_id', session.user.id)
      .eq('type', 'email')
      .eq('status', 'sent')
      .gte('created_at', eightWeeksAgo.toISOString()),
    supabase
      .from('inbound_messages')
      .select('received_at')
      .eq('user_id', session.user.id)
      .gte('received_at', eightWeeksAgo.toISOString()),
    supabase
      .from('businesses')
      .select('category, lead_score, pipeline_stage, outreach_status')
      .eq('user_id', session.user.id),
    supabase
      .from('sequence_enrollments')
      .select('status')
      .eq('user_id', session.user.id),
    supabase
      .from('outreach_logs')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('type', 'email')
      .eq('status', 'sent')
      .gt('open_count', 0)
      .gte('created_at', eightWeeksAgo.toISOString()),
  ])

  // --- Weekly buckets ---
  const weeks: { start: Date; label: string }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date()
    start.setDate(start.getDate() - i * 7)
    start.setHours(0, 0, 0, 0)
    weeks.push({ start, label: getWeekLabel(start) })
  }

  function bucketByWeek(items: { date: Date }[]): number[] {
    return weeks.map((week, idx) => {
      const end = idx < weeks.length - 1 ? weeks[idx + 1].start : new Date()
      return items.filter((x) => x.date >= week.start && x.date < end).length
    })
  }

  const sentByWeek = bucketByWeek((sentLogs ?? []).map((x) => ({ date: new Date(x.created_at) })))
  const repliesByWeek = bucketByWeek((inbound ?? []).map((x) => ({ date: new Date(x.received_at) })))

  const sentChartData = weeks.map((w, i) => ({ label: w.label, value: sentByWeek[i] }))
  const repliesChartData = weeks.map((w, i) => ({ label: w.label, value: repliesByWeek[i] }))
  const maxSent = Math.max(1, ...sentByWeek)
  const maxReplies = Math.max(1, ...repliesByWeek)

  // --- Top categories ---
  const categoryMap: Record<string, { leads: number; replied: number }> = {}
  for (const b of businesses ?? []) {
    const cat = (b.category as string)?.split(' ')[0] ?? 'Other'
    if (!categoryMap[cat]) categoryMap[cat] = { leads: 0, replied: 0 }
    categoryMap[cat].leads++
    if (b.outreach_status === 'replied') categoryMap[cat].replied++
  }
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1].leads - a[1].leads)
    .slice(0, 6)
    .map(([cat, { leads, replied }]) => ({
      cat,
      leads,
      replied,
      rate: leads > 0 ? Math.round((replied / leads) * 100) : 0,
    }))

  // --- Pipeline funnel ---
  const pipelineMap: Record<string, number> = {}
  for (const b of businesses ?? []) {
    const stage = (b.pipeline_stage as string) ?? 'new_lead'
    pipelineMap[stage] = (pipelineMap[stage] ?? 0) + 1
  }

  // --- Summary stats ---
  const totalSent = (sentLogs ?? []).length
  const totalReplies = (inbound ?? []).length
  const totalOpened = (openedLogs ?? []).length
  const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  const activeSequences = (enrollments ?? []).filter((e) => e.status === 'active').length
  const closedWon = pipelineMap['closed_won'] ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Performance over the last 8 weeks</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Emails Sent"
          value={totalSent}
          sub="Last 8 weeks"
          icon={Mail}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Opens"
          value={totalOpened}
          sub={`${openRate}% open rate`}
          icon={Eye}
          color="bg-sky-50 text-sky-600"
        />
        <StatCard
          title="Replies"
          value={totalReplies}
          sub="From businesses"
          icon={MessageSquare}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Reply Rate"
          value={`${replyRate}%`}
          sub="Replies ÷ emails sent"
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Active Sequences"
          value={activeSequences}
          sub="Leads in automation"
          icon={Zap}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Emails Sent Per Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={sentChartData} maxVal={maxSent} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Replies Received Per Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={repliesChartData} maxVal={maxReplies} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(({ cat, leads, replied, rate }) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{cat}</span>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{leads} leads</span>
                          <Badge variant={rate >= 20 ? 'default' : 'secondary'} className="text-xs">
                            {rate}% reply
                          </Badge>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (replied / Math.max(1, leads)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Pipeline Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(pipelineMap).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {[
                  ['new_lead', 'New Lead'],
                  ['contacted', 'Contacted'],
                  ['follow_up', 'Follow Up'],
                  ['replied', 'Replied'],
                  ['discovery_call', 'Discovery Call'],
                  ['proposal_sent', 'Proposal Sent'],
                  ['negotiation', 'Negotiation'],
                  ['closed_won', 'Closed Won'],
                  ['closed_lost', 'Closed Lost'],
                ]
                  .filter(([id]) => pipelineMap[id])
                  .map(([id, label]) => {
                    const count = pipelineMap[id] ?? 0
                    const total = businesses?.length ?? 1
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">{count}</span>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {closedWon > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              <strong>{closedWon} deal{closedWon !== 1 ? 's' : ''} closed</strong> — keep it up.
              {replyRate > 0 && ` Your overall reply rate is ${replyRate}%.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
