import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OutreachModal } from '@/components/outreach/OutreachModal'
import { LeadStatusSelect } from '@/components/leads/LeadStatusSelect'
import { MarkReadOnMount } from '@/components/inbox/MarkReadOnMount'
import { EnrollModal } from '@/components/sequences/EnrollModal'
import { AuditButton } from '@/components/audit/AuditButton'
import { FindEmailButton } from '@/components/leads/FindEmailButton'
import { LeadNotesTab } from '@/components/leads/LeadNotesTab'
import { LeadActivityTab } from '@/components/leads/LeadActivityTab'
import { ProposalButton } from '@/components/proposals/ProposalButton'
import type { Business, OutreachLog, InboundMessage, AuditReport } from '@/types'
import { createAdminClient } from '@/lib/supabase-server'
import {
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
} from 'lucide-react'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-500'
  const bgColor =
    score >= 70 ? 'bg-green-100' : score >= 40 ? 'bg-yellow-100' : 'bg-red-100'

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${bgColor}`}>
      <span className={`text-2xl font-bold ${color}`}>{score}</span>
      <span className={`text-sm ${color}`}>/100</span>
    </div>
  )
}

export default async function LeadDetailPage({ params: paramsPromise }: LeadDetailPageProps) {
  const { id } = await paramsPromise
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!business) notFound()

  const { data: outreachLogs } = await supabase
    .from('outreach_logs')
    .select('*')
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: inboundMessages } = await supabase
    .from('inbound_messages')
    .select('*')
    .eq('business_id', id)
    .eq('user_id', user!.id)
    .order('received_at', { ascending: true })

  const admin = createAdminClient()
  const [{ data: existingAudit }, { data: existingProposal }] = await Promise.all([
    admin
      .from('audit_reports')
      .select('share_token')
      .eq('business_id', id)
      .eq('user_id', user!.id)
      .maybeSingle(),
    admin
      .from('proposals')
      .select('id, share_token, status, title')
      .eq('business_id', id)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const biz = business as Business
  const logs = (outreachLogs as OutreachLog[]) ?? []
  const replies = (inboundMessages as InboundMessage[]) ?? []
  const unreadCount = replies.filter((r) => !r.read).length

  // Build unified conversation timeline
  type TimelineItem =
    | { kind: 'sent'; log: OutreachLog; time: string }
    | { kind: 'reply'; msg: InboundMessage; time: string }

  const timeline: TimelineItem[] = [
    ...logs
      .filter((l) => l.type === 'email' && l.status === 'sent')
      .map((log) => ({ kind: 'sent' as const, log, time: log.created_at })),
    ...replies.map((msg) => ({ kind: 'reply' as const, msg, time: msg.received_at })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  const statusColors: Record<string, string> = {
    not_contacted: 'secondary',
    generated: 'outline',
    sent: 'default',
    replied: 'default',
    interested: 'default',
    closed: 'default',
    not_interested: 'destructive',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{biz.name}</h1>
          <p className="text-muted-foreground mt-1">
            {biz.category} &bull; {biz.city}, {biz.state}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={(statusColors[biz.outreach_status] as 'default' | 'secondary' | 'outline' | 'destructive') ?? 'secondary'}>
            {biz.outreach_status.replaceAll('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {biz.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{biz.address}, {biz.city}, {biz.state}</span>
              </div>
            )}
            {biz.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <a href={`tel:${biz.phone}`} className="hover:text-primary">{biz.phone}</a>
                  {biz.phone_source && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {biz.phone_source === 'google_maps' ? 'From Google Maps' : biz.phone_source}
                      {biz.phone_confidence != null ? ` · ${biz.phone_confidence}% confidence` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              {biz.email ? (
                <div className="flex-1">
                  <a href={`mailto:${biz.email}`} className="hover:text-primary">{biz.email}</a>
                  {biz.email_source && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {biz.email_source === 'hunter' ? 'Found via Hunter.io' : biz.email_source}
                      {biz.email_confidence != null ? ` · ${biz.email_confidence}% confidence` : ''}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground italic text-sm">No email on file</span>
              )}
            </div>
            <FindEmailButton
              businessId={biz.id}
              hasWebsite={biz.has_website}
              existingEmail={biz.email}
            />
            {biz.website_url && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={biz.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate max-w-xs">
                  {biz.website_url}
                </a>
              </div>
            )}
            {biz.google_maps_url && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <a href={biz.google_maps_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  View on Google Maps
                </a>
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              <span><strong>{biz.rating}</strong> rating &bull; {biz.review_count} reviews</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Website Analysis</CardTitle>
            <CardDescription>Quality assessment and improvement opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quality Score</span>
              <ScoreGauge score={biz.website_quality_score} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {biz.has_website ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span>{biz.has_website ? 'Has a website' : 'No website detected'}</span>
            </div>
            {biz.website_issues && biz.website_issues.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Issues Found:</p>
                <ul className="space-y-1">
                  {biz.website_issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Lead Score &amp; AI Recommendation</span>
            <ScoreGauge score={biz.lead_score} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {biz.ai_score_reasoning ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{biz.ai_score_reasoning}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This lead scored <strong>{biz.lead_score}/100</strong> based on website quality,
              review count, rating, and business category signals.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Outreach Management</CardTitle>
          <CardDescription>Generate and send personalized AI outreach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Update Status</p>
              <LeadStatusSelect businessId={biz.id} currentStatus={biz.outreach_status} />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <OutreachModal business={biz} />
            <EnrollModal businessId={biz.id} businessName={biz.name} />
            <AuditButton businessId={biz.id} existingToken={existingAudit?.share_token ?? null} />
            <ProposalButton
              businessId={biz.id}
              businessName={biz.name}
              existingProposalId={existingProposal?.id ?? null}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabbed bottom section: Conversation, Notes, Activity */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="conversation">
            <TabsList className="mb-4">
              <TabsTrigger value="conversation">
                Conversation
                {unreadCount > 0 && (
                  <span className="ml-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="conversation">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No outreach activity yet. Generate your first email above.
                </p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item) => {
                    if (item.kind === 'sent') {
                      const log = item.log
                      return (
                        <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0">
                          <div className="shrink-0 mt-0.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">You sent an email</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            {log.subject && (
                              <p className="text-sm text-muted-foreground">Subject: {log.subject}</p>
                            )}
                            {log.sent_to && (
                              <p className="text-xs text-muted-foreground mt-0.5">To: {log.sent_to}</p>
                            )}
                            {(log.open_count ?? 0) > 0 && (
                              <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Opened {log.open_count} time{log.open_count === 1 ? '' : 's'}
                                {log.first_opened_at ? ` · first ${new Date(log.first_opened_at).toLocaleDateString()}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    }

                    const msg = item.msg
                    return (
                      <div key={msg.id} className={`flex gap-3 pb-4 border-b last:border-0 ${!msg.read ? 'bg-primary/5 -mx-2 px-2 rounded-lg' : ''}`}>
                        <div className="shrink-0 mt-0.5">
                          <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                            <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {msg.from_name ?? msg.from_email}
                              </span>
                              {!msg.read && <Badge className="text-xs px-1.5 py-0 h-4">New</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.received_at).toLocaleString()}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs text-muted-foreground mb-1">Re: {msg.subject}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Generation history */}
              {logs.some((l) => l.type === 'generated') && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    AI Draft History
                  </p>
                  <div className="space-y-2">
                    {logs
                      .filter((l) => l.type === 'generated')
                      .map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>AI draft generated</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes">
              <LeadNotesTab businessId={biz.id} />
            </TabsContent>

            <TabsContent value="activity">
              <LeadActivityTab businessId={biz.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Mark replies as read when page is opened */}
      {unreadCount > 0 && <MarkReadOnMount businessId={biz.id} />}
    </div>
  )
}
