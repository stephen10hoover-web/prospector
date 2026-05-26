'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { Business, OutreachStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OutreachModal } from '@/components/outreach/OutreachModal'
import { cn } from '@/lib/utils'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Globe,
  ExternalLink,
  Mail,
} from 'lucide-react'

interface LeadsTableProps {
  leads: Business[]
}

type SortKey = 'lead_score' | 'name' | 'city' | 'review_count' | 'rating'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

const STATUS_COLORS: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-100 text-gray-700',
  generated: 'bg-blue-100 text-blue-700',
  sent: 'bg-purple-100 text-purple-700',
  replied: 'bg-green-100 text-green-700',
  interested: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-700',
  not_interested: 'bg-red-100 text-red-700',
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'bg-green-100 text-green-700'
      : score >= 40
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-bold', color)}>
      {score}
    </span>
  )
}

export function LeadsTable({ leads: initialLeads }: LeadsTableProps) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [sortKey, setSortKey] = useState<SortKey>('lead_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [outreachLead, setOutreachLead] = useState<Business | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  const sorted = [...leads].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleStatusChange(leadId: string, status: OutreachStatus) {
    setUpdatingStatus(leadId)
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, outreach_status: status } : l))
      )
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  }

  function SortHeader({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortHeader col="name" label="Name" />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader col="city" label="City" />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</span>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website</span>
                </th>
                <th className="px-4 py-3 text-center">
                  <SortHeader col="lead_score" label="Score" />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                </th>
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[180px]">{lead.name}</p>
                    {lead.rating > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ★ {lead.rating} ({lead.review_count})
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground truncate max-w-[120px] block">{lead.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">{lead.city}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {lead.phone && (
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      )}
                      {lead.email && (
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{lead.email}</p>
                      )}
                      {!lead.phone && !lead.email && (
                        <p className="text-xs text-muted-foreground">—</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.has_website ? (
                      <div className="flex flex-col items-center gap-1">
                        <Globe className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">{lead.website_quality_score}%</span>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-xs">No site</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ScoreBadge score={lead.lead_score} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.outreach_status}
                      onValueChange={(val) => handleStatusChange(lead.id, val as OutreachStatus)}
                      disabled={updatingStatus === lead.id}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_contacted">Not Contacted</SelectItem>
                        <SelectItem value="generated">Generated</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="replied">Replied</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setOutreachLead(lead)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Outreach
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {outreachLead && (
        <OutreachModal
          business={outreachLead}
          defaultOpen
          onClose={() => setOutreachLead(null)}
        />
      )}
    </div>
  )
}
