'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Webhook, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'
import type { OutboundWebhook } from '@/types'

const WEBHOOK_EVENTS = [
  { value: 'lead_replied', label: 'Lead Replied' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'proposal_viewed', label: 'Proposal Viewed' },
  { value: 'deal_won', label: 'Deal Won' },
  { value: 'sequence_enrolled', label: 'Sequence Enrolled' },
  { value: 'sequence_completed', label: 'Sequence Completed' },
] as const

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<OutboundWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['lead_replied'])
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, { id: string; event: string; status_code: number | null; success: boolean; created_at: string }[]>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/webhooks')
      .then((r) => r.ok ? r.json() : [])
      .then(setWebhooks)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function addWebhook() {
    if (!webhookUrl.trim()) { toast.error('URL is required'); return }
    if (webhookEvents.length === 0) { toast.error('Select at least one event'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents, active: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create webhook')
      setWebhooks((prev) => [json, ...prev])
      setWebhookUrl('')
      setWebhookEvents(['lead_replied'])
      toast.success('Webhook created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create webhook')
    } finally {
      setSaving(false)
    }
  }

  async function toggleWebhook(webhook: OutboundWebhook) {
    const res = await fetch(`/api/webhooks/${webhook.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !webhook.active }),
    })
    if (res.ok) {
      const updated: OutboundWebhook = await res.json()
      setWebhooks((prev) => prev.map((w) => w.id === updated.id ? updated : w))
    } else {
      toast.error('Failed to update webhook')
    }
  }

  async function deleteWebhook(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
      toast.success('Webhook deleted')
    } else {
      toast.error('Failed to delete webhook')
    }
    setDeletingId(null)
  }

  async function loadDeliveries(webhookId: string) {
    if (expandedId === webhookId) { setExpandedId(null); return }
    setExpandedId(webhookId)
    if (deliveries[webhookId]) return
    setLoadingDeliveries(webhookId)
    const res = await fetch(`/api/webhooks/${webhookId}/deliveries`)
    if (res.ok) {
      const data = await res.json()
      setDeliveries((prev) => ({ ...prev, [webhookId]: data }))
    }
    setLoadingDeliveries(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Receive real-time HTTP POST notifications when events occur in your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint URL (HTTPS required)</Label>
              <Input
                placeholder="https://your-server.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Events to Subscribe</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map(({ value, label }) => {
                  const active = webhookEvents.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setWebhookEvents((prev) => active ? prev.filter((e) => e !== value) : [...prev, value])}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <Button size="sm" onClick={addWebhook} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Add Webhook
            </Button>
          </div>

          {/* Webhook list */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No webhooks configured yet.</p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((wh) => (
                <div key={wh.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{wh.url}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{wh.events.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleWebhook(wh)} className="text-muted-foreground hover:text-foreground" title={wh.active ? 'Disable' : 'Enable'}>
                        {wh.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button onClick={() => loadDeliveries(wh.id)} className="text-xs text-muted-foreground hover:text-foreground">
                        {expandedId === wh.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteWebhook(wh.id)} disabled={deletingId === wh.id} className="text-destructive hover:text-destructive/80">
                        {deletingId === wh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {expandedId === wh.id && (
                    <div className="border-t bg-muted/30 p-3 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Deliveries</p>
                      {loadingDeliveries === wh.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (deliveries[wh.id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No deliveries yet</p>
                      ) : (
                        (deliveries[wh.id] ?? []).map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-xs">
                            <span className={d.success ? 'text-green-600' : 'text-destructive'}>{d.success ? '✓' : '✗'}</span>
                            <span className="font-mono">{d.event}</span>
                            <span className="text-muted-foreground">{d.status_code ?? '—'}</span>
                            <span className="text-muted-foreground ml-auto">{new Date(d.created_at).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
