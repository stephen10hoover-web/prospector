'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, ExternalLink, Eye, Clock, CheckCircle, XCircle, Send, Loader2, Trash2, Copy } from 'lucide-react'
import type { Proposal } from '@/types'

const STATUS_LABELS: Record<Proposal['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
}

const STATUS_VARIANTS: Record<Proposal['status'], 'secondary' | 'default' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  sent: 'outline',
  viewed: 'default',
  accepted: 'default',
  declined: 'destructive',
}

function StatusIcon({ status }: { status: Proposal['status'] }) {
  switch (status) {
    case 'draft': return <Clock className="h-3.5 w-3.5" />
    case 'sent': return <Send className="h-3.5 w-3.5" />
    case 'viewed': return <Eye className="h-3.5 w-3.5" />
    case 'accepted': return <CheckCircle className="h-3.5 w-3.5" />
    case 'declined': return <XCircle className="h-3.5 w-3.5" />
  }
}

export default function ProposalListPage() {
  const params = useParams<{ id: string }>()
  const businessId = params.id
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    fetchProposals()
  }, [businessId])

  async function fetchProposals() {
    try {
      const res = await fetch(`/api/leads/${businessId}/proposals`)
      if (res.ok) setProposals(await res.json())
    } catch {
      toast.error('Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }

  async function markSent(proposal: Proposal) {
    if (proposal.status !== 'draft') return
    setMarkingId(proposal.id)
    try {
      const res = await fetch(`/api/leads/${businessId}/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })
      if (!res.ok) throw new Error('Update failed')
      const updated: Proposal = await res.json()
      setProposals((prev) => prev.map((p) => p.id === updated.id ? updated : p))
      toast.success('Marked as sent')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setMarkingId(null)
    }
  }

  async function deleteProposal(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/leads/${businessId}/proposals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setProposals((prev) => prev.filter((p) => p.id !== id))
      toast.success('Proposal deleted')
    } catch {
      toast.error('Failed to delete proposal')
    } finally {
      setDeletingId(null)
    }
  }

  function copyShareLink(token: string) {
    const url = `${appUrl}/proposal/${token}`
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'))
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/leads/${businessId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Lead
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
            <p className="text-sm text-muted-foreground">Manage proposals for this lead</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href={`/leads/${businessId}/proposal/new`}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Proposal
          </Link>
        </Button>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Send className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No proposals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a shareable proposal to send to this lead.</p>
            <Button asChild>
              <Link href={`/leads/${businessId}/proposal/new`}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Proposal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{proposal.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {new Date(proposal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {proposal.viewed_at && (
                        <> · Viewed {new Date(proposal.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {proposal.view_count > 1 && <> ({proposal.view_count} times)</>}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[proposal.status]} className="flex items-center gap-1 shrink-0">
                    <StatusIcon status={proposal.status} />
                    {STATUS_LABELS[proposal.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/proposal/${proposal.share_token}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyShareLink(proposal.share_token)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Link
                  </Button>
                  {proposal.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markSent(proposal)}
                      disabled={markingId === proposal.id}
                    >
                      {markingId === proposal.id
                        ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Mark as Sent
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => deleteProposal(proposal.id)}
                    disabled={deletingId === proposal.id}
                  >
                    {deletingId === proposal.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
