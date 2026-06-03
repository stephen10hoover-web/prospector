'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Loader2, ChevronDown, ChevronUp, Send } from 'lucide-react'

interface SupportTicket {
  id: string
  user_email: string
  subject: string
  category: string
  status: string
  admin_reply: string | null
  created_at: string
  updated_at: string
}

const STATUS_BADGE: Record<string, string> = {
  open:        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved:    'bg-green-500/20 text-green-300 border-green-500/30',
  closed:      'bg-white/10 text-white/40 border-white/10',
}

const CATEGORY_BADGE: Record<string, string> = {
  billing: 'text-orange-300',
  bug:     'text-red-300',
  feature: 'text-blue-300',
  general: 'text-white/40',
}

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const fetchTickets = useCallback(async (append = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '25' })
      if (statusFilter) params.set('status', statusFilter)
      if (append && cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/internal/support?${params}`)
      const data = await res.json()
      const rows: SupportTicket[] = data.tickets ?? []

      setTickets((prev) => append ? [...prev, ...rows] : rows)
      setTotal(data.total ?? 0)
      setHasMore(data.hasMore ?? false)
      setCursor(data.nextCursor ?? null)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, cursor])

  useEffect(() => {
    setCursor(null)
    fetchTickets(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function updateTicket(id: string, update: { status?: string; reply?: string }) {
    setSaving(id)
    try {
      await fetch('/api/internal/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...update }),
      })
      setTickets((prev) => prev.map((t) => t.id === id ? {
        ...t,
        status: update.status ?? (update.reply ? 'resolved' : t.status),
        admin_reply: update.reply ?? t.admin_reply,
      } : t))
      if (update.reply) setReplyText('')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support</h1>
          <p className="text-sm text-white/40 mt-0.5">{total.toLocaleString()} {statusFilter} tickets</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {['open', 'in_progress', 'resolved', 'closed', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No {statusFilter} tickets</p>
          <p className="text-xs text-white/20 mt-1">New support requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-white/3 transition-colors"
                onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium uppercase ${CATEGORY_BADGE[ticket.category] ?? 'text-white/40'}`}>
                      {ticket.category}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${STATUS_BADGE[ticket.status] ?? STATUS_BADGE.open}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 truncate">{ticket.subject}</p>
                  <p className="text-xs text-white/30 mt-0.5">{ticket.user_email} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                {expanded === ticket.id ? (
                  <ChevronUp className="h-4 w-4 text-white/30 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/30 shrink-0" />
                )}
              </div>

              {/* Expanded */}
              {expanded === ticket.id && (
                <div className="border-t border-white/5 px-5 py-4 space-y-4">
                  {/* Status controls */}
                  <div className="flex gap-2 flex-wrap">
                    {VALID_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateTicket(ticket.id, { status: s })}
                        disabled={ticket.status === s || saving === ticket.id}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-30 ${
                          ticket.status === s
                            ? (STATUS_BADGE[s] ?? 'bg-white/10 text-white/40 border-white/10')
                            : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Reply */}
                  {ticket.admin_reply ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-xs text-green-300 font-medium mb-1">Your reply</p>
                      <p className="text-sm text-white/70">{ticket.admin_reply}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        placeholder="Reply to user (sends email)..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-none"
                      />
                      <button
                        onClick={() => updateTicket(ticket.id, { reply: replyText })}
                        disabled={!replyText.trim() || saving === ticket.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 text-sm transition-colors disabled:opacity-40"
                      >
                        {saving === ticket.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Send Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchTickets(true)}
                disabled={loading}
                className="text-xs px-4 py-2 rounded-lg bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/8 transition-colors"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
