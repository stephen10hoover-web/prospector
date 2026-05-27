'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Star, Globe, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Business } from '@/types'

const STAGES = [
  { id: 'new_lead', label: 'New Lead', color: 'bg-slate-100 text-slate-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'replied', label: 'Replied', color: 'bg-purple-100 text-purple-700' },
  { id: 'discovery_call', label: 'Discovery Call', color: 'bg-orange-100 text-orange-700' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-pink-100 text-pink-700' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-700' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700' },
] as const

type StageId = typeof STAGES[number]['id']

interface KanbanBoardProps {
  initialLeads: Business[]
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Business[]>(
    initialLeads.map((l) => ({ ...l, pipeline_stage: (l as Business & { pipeline_stage?: string }).pipeline_stage ?? 'new_lead' }))
  )
  const draggingId = useRef<string | null>(null)
  const draggingFrom = useRef<string | null>(null)

  function getLeadsForStage(stageId: string) {
    return leads.filter((l) => (l as Business & { pipeline_stage: string }).pipeline_stage === stageId)
  }

  function handleDragStart(e: React.DragEvent, leadId: string, fromStage: string) {
    draggingId.current = leadId
    draggingFrom.current = fromStage
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e: React.DragEvent, toStage: string) {
    e.preventDefault()
    const leadId = draggingId.current
    const fromStage = draggingFrom.current
    if (!leadId || fromStage === toStage) return

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, pipeline_stage: toStage } as Business & { pipeline_stage: string } : l
      )
    )

    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: toStage }),
      })
      if (!res.ok) throw new Error('Failed to update')
    } catch {
      // Rollback
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, pipeline_stage: fromStage } as Business & { pipeline_stage: string } : l
        )
      )
      toast.error('Failed to move lead')
    }

    draggingId.current = null
    draggingFrom.current = null
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 min-h-[600px]">
      {STAGES.map((stage) => {
        const stageLeads = getLeadsForStage(stage.id)
        return (
          <div
            key={stage.id}
            className="flex flex-col shrink-0 w-64"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>
                {stage.label}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{stageLeads.length}</span>
            </div>

            <div className="flex flex-col gap-2 flex-1 bg-muted/30 rounded-xl p-2 min-h-[120px]">
              {stageLeads.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border-2 border-dashed border-muted rounded-lg">
                  Drop here
                </div>
              )}
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  stageId={stage.id}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LeadCard({
  lead,
  stageId,
  onDragStart,
}: {
  lead: Business
  stageId: string
  onDragStart: (e: React.DragEvent, id: string, stage: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id, stageId)}
      className="bg-card rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none"
    >
      <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium leading-snug hover:text-primary truncate">
          {lead.name}
        </p>
      </Link>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">
        {lead.category} · {lead.city}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-0.5">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs text-muted-foreground">{lead.rating}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {lead.has_website ? (
            <Globe className="h-3 w-3 text-green-500" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-400" />
          )}
        </div>
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0 h-4 ml-auto"
        >
          {lead.lead_score}
        </Badge>
      </div>
    </div>
  )
}
