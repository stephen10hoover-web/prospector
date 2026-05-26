import { createServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Users, Mail, MessageSquare, TrendingUp, Search, ArrowRight } from 'lucide-react'
import type { DashboardStats, Search as SearchType } from '@/types'

async function getDashboardData(userId: string): Promise<{
  stats: DashboardStats
  recentSearches: SearchType[]
}> {
  const supabase = createServerClient()

  const [
    { count: totalLeads },
    { count: emailsSent },
    { count: replies },
    { data: scoreData },
    { data: recentSearches },
  ] = await Promise.all([
    supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('outreach_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'sent'),
    supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('outreach_status', 'replied'),
    supabase
      .from('businesses')
      .select('lead_score')
      .eq('user_id', userId),
    supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const scores = scoreData?.map((b) => b.lead_score) ?? []
  const avgLeadScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return {
    stats: {
      totalLeads: totalLeads ?? 0,
      emailsSent: emailsSent ?? 0,
      replies: replies ?? 0,
      avgLeadScore,
    },
    recentSearches: (recentSearches as SearchType[]) ?? [],
  }
}

export default async function DashboardPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { stats, recentSearches } = await getDashboardData(session.user.id)

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      description: 'Businesses discovered',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Emails Sent',
      value: stats.emailsSent,
      description: 'Outreach delivered',
      icon: Mail,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Replies',
      value: stats.replies,
      description: 'Leads responded',
      icon: MessageSquare,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Avg Lead Score',
      value: `${stats.avgLeadScore}/100`,
      description: 'Opportunity quality',
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your lead generation activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`${card.bg} p-2 rounded-lg`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/search">
            <Search className="h-4 w-4 mr-2" />
            New Search
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/leads">
            View All Leads
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Searches</CardTitle>
          <CardDescription>Your latest business discovery searches</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSearches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="bg-primary/5 rounded-full p-4 w-fit mx-auto mb-4">
                <Search className="h-10 w-10 text-primary opacity-60" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">No searches yet</p>
              <p className="text-sm mb-6 max-w-xs mx-auto">
                Search for local businesses by category and location. We&apos;ll score, analyze, and prep outreach for every lead.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link href="/search">
                    <Search className="h-4 w-4 mr-2" />
                    Run Your First Search
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 text-center max-w-sm mx-auto">
                {[
                  { step: '1', label: 'Search a category + city' },
                  { step: '2', label: 'Review AI-scored leads' },
                  { step: '3', label: 'Send personalized outreach' },
                ].map(({ step, label }) => (
                  <div key={step} className="space-y-1">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mx-auto">
                      {step}
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {search.category} in {search.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {search.radius} mile radius &bull;{' '}
                        {new Date(search.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{search.result_count} leads</Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/leads?search_id=${search.id}`}>
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
