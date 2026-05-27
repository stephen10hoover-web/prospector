import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Inbox, Mail, MailOpen } from 'lucide-react'
import type { InboundMessage, Business } from '@/types'

interface ConversationRow extends InboundMessage {
  businesses: Pick<Business, 'name' | 'category' | 'city' | 'state'>
}

export default async function InboxPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const { data: messages } = await supabase
    .from('inbound_messages')
    .select('*, businesses(name, category, city, state)')
    .eq('user_id', session.user.id)
    .order('received_at', { ascending: false })

  const rows = (messages ?? []) as ConversationRow[]

  // Group by business_id — show latest message per business
  const seen = new Set<string>()
  const conversations = rows.filter((m) => {
    if (seen.has(m.business_id)) return false
    seen.add(m.business_id)
    return true
  })

  // Unread count per business
  const unreadByBusiness: Record<string, number> = {}
  for (const m of rows) {
    if (!m.read) {
      unreadByBusiness[m.business_id] = (unreadByBusiness[m.business_id] ?? 0) + 1
    }
  }

  const totalUnread = rows.filter((m) => !m.read).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Replies from businesses you&apos;ve reached out to
          </p>
        </div>
        {totalUnread > 0 && (
          <Badge className="ml-auto">{totalUnread} unread</Badge>
        )}
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MailOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No replies yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              When a business replies to your outreach email it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const unread = unreadByBusiness[conv.business_id] ?? 0
            const biz = conv.businesses
            return (
              <Link key={conv.business_id} href={`/leads/${conv.business_id}`}>
                <Card className={`transition-colors hover:bg-accent/50 cursor-pointer ${unread > 0 ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <CardContent className="py-4 px-5 flex items-center gap-4">
                    <div className="shrink-0">
                      {unread > 0 ? (
                        <Mail className="h-5 w-5 text-primary" />
                      ) : (
                        <MailOpen className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm ${unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                          {biz?.name ?? 'Unknown Business'}
                        </span>
                        {unread > 0 && (
                          <Badge variant="default" className="text-xs px-1.5 py-0 h-4">
                            {unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.from_name ? `${conv.from_name} · ` : ''}{conv.body.slice(0, 80)}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(conv.received_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
