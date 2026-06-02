'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Ban, Plus, Trash2 } from 'lucide-react'
import type { EmailSuppression, DomainSuppression } from '@/types'

export default function SuppressionsSettingsPage() {
  const [emailSuppressions, setEmailSuppressions] = useState<EmailSuppression[]>([])
  const [domainSuppressions, setDomainSuppressions] = useState<DomainSuppression[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [addingDomain, setAddingDomain] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/suppressions?type=email').then((r) => r.ok ? r.json() : []),
      fetch('/api/suppressions?type=domain').then((r) => r.ok ? r.json() : []),
    ]).then(([emails, domains]) => {
      setEmailSuppressions(emails)
      setDomainSuppressions(domains)
    }).catch(() => null).finally(() => setLoading(false))
  }, [])

  async function addSuppression(type: 'email' | 'domain') {
    const value = type === 'email' ? newEmail.trim() : newDomain.trim()
    if (!value) return
    if (type === 'email') setAddingEmail(true)
    else setAddingDomain(true)
    try {
      const body = type === 'email' ? { type: 'email', email: value } : { type: 'domain', domain: value }
      const res = await fetch('/api/suppressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to add')
      if (type === 'email') { setEmailSuppressions((p) => [json, ...p]); setNewEmail('') }
      else { setDomainSuppressions((p) => [json, ...p]); setNewDomain('') }
      toast.success(`${type === 'email' ? 'Email' : 'Domain'} suppressed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add suppression')
    } finally {
      if (type === 'email') setAddingEmail(false)
      else setAddingDomain(false)
    }
  }

  async function removeSuppression(id: string, type: 'email' | 'domain') {
    setDeletingId(id)
    const res = await fetch(`/api/suppressions/${id}?type=${type}`, { method: 'DELETE' })
    if (res.ok) {
      if (type === 'email') setEmailSuppressions((p) => p.filter((s) => s.id !== id))
      else setDomainSuppressions((p) => p.filter((s) => s.id !== id))
    } else {
      toast.error('Failed to remove')
    }
    setDeletingId(null)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Suppression List
          </CardTitle>
          <CardDescription>Emails and domains blocked from receiving any outreach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Email suppressions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Suppressed Emails</Label>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSuppression('email')}
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={() => addSuppression('email')} disabled={addingEmail} className="shrink-0">
                {addingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {emailSuppressions.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {emailSuppressions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="font-mono text-xs">{s.email}</span>
                    <button onClick={() => removeSuppression(s.id, 'email')} disabled={deletingId === s.id} className="text-muted-foreground hover:text-destructive shrink-0">
                      {deletingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No suppressed emails yet.</p>
            )}
          </div>

          <Separator />

          {/* Domain suppressions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Suppressed Domains</Label>
            <div className="flex gap-2">
              <Input
                placeholder="competitor.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSuppression('domain')}
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={() => addSuppression('domain')} disabled={addingDomain} className="shrink-0">
                {addingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {domainSuppressions.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {domainSuppressions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="font-mono text-xs">@{s.domain}</span>
                    <button onClick={() => removeSuppression(s.id, 'domain')} disabled={deletingId === s.id} className="text-muted-foreground hover:text-destructive shrink-0">
                      {deletingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No suppressed domains yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
