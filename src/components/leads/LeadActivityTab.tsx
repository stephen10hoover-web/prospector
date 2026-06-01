'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Activity } from 'lucide-react'
import type { LeadActivity, LeadActivityType } from '@/types'

interface LeadActivityTabProps {
  businessId: string
}

const ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  note_added: 'Note added',
  note_updated: 'Note updated',
  note_deleted: 'Note deleted',
  email_sent: 'Email sent',
  email_opened: 'Email opened',
  reply_received: 'Reply received',
  stage_changed: 'Pipeline stage changed',
  status_changed: 'Status changed',
  call_logged: 'Call logged',
  task_completed: 'Task completed',
  imported: 'Lead imported',
  proposal_sent: 'Proposal sent',
  proposal_viewed: 'Proposal viewed',
  sequence_enrolled: 'Enrolled in sequence',
  sequence_replied: 'Replied to sequence',
  sequence_completed: 'Sequence completed',
}

const ACTIVITY_COLORS: Record<LeadActivityType, string> = {
  note_added: 'bg-blue-100 text-blue-700',
  note_updated: 'bg-blue-100 text-blue-700',
  note_deleted: 'bg-gray-100 text-gray-600',
  email_sent: 'bg-purple-100 text-purple-700',
  email_opened: 'bg-sky-100 text-sky-700',
  reply_received: 'bg-green-100 text-green-700',
  stage_changed: 'bg-orange-100 text-orange-700',
  status_changed: 'bg-yellow-100 text-yellow-700',
  call_logged: 'bg-teal-100 text-teal-700',
  task_completed: 'bg-emerald-100 text-emerald-700',
  imported: 'bg-slate-100 text-slate-700',
  proposal_sent: 'bg-indigo-100 text-indigo-700',
  proposal_viewed: 'bg-violet-100 text-violet-700',
  sequence_enrolled: 'bg-pink-100 text-pink-700',
  sequence_replied: 'bg-green-100 text-green-700',
  sequence_completed: 'bg-gray-100 text-gray-600',
}

function activityDetail(activity: LeadActivity): string | null {
  const m = activity.metadata
  switch (activity.type) {
    case 'stage_changed':
      return `${String(m.from ?? '').replace(/_/g, ' ')} → ${String(m.to ?? '').replace(/_/g, ' ')}`
    case 'status_changed':
      return `${String(m.from ?? '').replace(/_/g, ' ')} → ${String(m.to ?? '').replace(/_/g, ' ')}`
    case 'reply_received':
      return m.from_email ? `From: ${String(m.from_email)}` : null
    case 'email_sent':
      return m.subject ? `Subject: ${String(m.subject)}` : null
    case 'note_added':
    case 'note_updated':
      return m.preview ? `"${String(m.preview)}${String(m.preview).length >= 100 ? '…' : ''}"` : null
    case 'call_logged':
      return [
        m.duration ? `${m.duration}min` : null,
        m.outcome ? String(m.outcome) : null,
      ].filter(Boolean).join(' · ')
    default:
      return null
  }
}

export function LeadActivityTab({ businessId }: LeadActivityTabProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/leads/${businessId}/activity`)
      .then((r) => r.json())
      .then(setActivities)
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false))
  }, [businessId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <Activity className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium mb-1">No activity yet</p>
        <p className="text-xs text-muted-foreground">
          Activity is recorded automatically as you work with this lead.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-4">
        {activities.map((activity) => {
          const detail = activityDetail(activity)
          const colorClass = ACTIVITY_COLORS[activity.type] ?? 'bg-gray-100 text-gray-600'
          return (
            <div key={activity.id} className="flex gap-4 pl-8 relative">
              {/* Dot */}
              <div className={`absolute left-2 top-1 h-3 w-3 rounded-full border-2 border-background ${colorClass.split(' ')[0]}`} />
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${colorClass}`}>
                      {ACTIVITY_LABELS[activity.type]}
                    </span>
                    {detail && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">{detail}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(activity.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
