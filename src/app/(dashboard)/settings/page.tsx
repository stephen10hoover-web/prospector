'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2, Zap, CreditCard, BarChart2, CheckCircle, Palette,
  Mail, MapPin, Clock, Star, Users, Shield, User, Download, Trash2,
  Webhook, Ban, Link2, Plus, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PLAN_META, PLAN_LIMITS, planDisplayName, type PlanId } from '@/lib/plans'
import type { OutboundWebhook, EmailSuppression, DomainSuppression } from '@/types'

const WEBHOOK_EVENTS = [
  { value: 'lead_replied', label: 'Lead Replied' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'proposal_viewed', label: 'Proposal Viewed' },
  { value: 'deal_won', label: 'Deal Won' },
  { value: 'sequence_enrolled', label: 'Sequence Enrolled' },
  { value: 'sequence_completed', label: 'Sequence Completed' },
] as const

interface SenderProfile {
  full_name: string
  company_name: string
  mailing_address: string
  booking_link: string
}

interface BillingData {
  plan: PlanId
  status: string
  current_period_end: string | null
  is_expired: boolean
  trial_days_remaining: number | null
  trial_expires_at: string | null
  usage: {
    searches_count: number
    emails_sent_count: number
  }
  limits: {
    searchLimit: number
    emailLimit: number
    mileLimit: number
    generationLimit: number
    period: 'week' | 'month'
  }
}

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free_trial: Clock,
  pro: Zap,
  team: Users,
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<PlanId | null>(null)
  const [portaling, setPortaling] = useState(false)
  const [profile, setProfile] = useState<SenderProfile>({ full_name: '', company_name: '', mailing_address: '', booking_link: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Webhooks
  const [webhooks, setWebhooks] = useState<OutboundWebhook[]>([])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['lead_replied'])
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null)
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, { id: string; event: string; status_code: number | null; success: boolean; created_at: string }[]>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null)

  // Suppressions
  const [emailSuppressions, setEmailSuppressions] = useState<EmailSuppression[]>([])
  const [domainSuppressions, setDomainSuppressions] = useState<DomainSuppression[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [addingDomain, setAddingDomain] = useState(false)
  const [deletingSuppId, setDeletingSuppId] = useState<string | null>(null)

  // Team / Workspaces
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; slug: string; role: string; created_at: string }[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitingToWorkspace, setInvitingToWorkspace] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Welcome! Your plan has been upgraded.')
    }
    fetchBillingData()
    fetchProfile()
    fetchWebhooks()
    fetchSuppressions('email')
    fetchSuppressions('domain')
    fetchWorkspaces()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const json = await res.json()
        setProfile({
          full_name: json.full_name ?? '',
          company_name: json.company_name ?? '',
          mailing_address: json.mailing_address ?? '',
          booking_link: json.booking_link ?? '',
        })
      }
    } catch {
      // non-fatal
    }
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function exportData() {
    setExporting(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prospector-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This cannot be undone. All your leads, outreach history, and settings will be deleted.'
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Deletion failed')
      window.location.href = '/'
    } catch {
      toast.error('Failed to delete account. Please contact support@prospector.app.')
      setDeleting(false)
    }
  }

  async function fetchWebhooks() {
    try {
      const res = await fetch('/api/webhooks')
      if (res.ok) setWebhooks(await res.json())
    } catch { /* non-fatal */ }
  }

  async function addWebhook() {
    if (!webhookUrl.trim()) { toast.error('URL is required'); return }
    if (webhookEvents.length === 0) { toast.error('Select at least one event'); return }
    setSavingWebhook(true)
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
      setSavingWebhook(false)
    }
  }

  async function toggleWebhook(webhook: OutboundWebhook) {
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !webhook.active }),
      })
      if (!res.ok) throw new Error()
      const updated: OutboundWebhook = await res.json()
      setWebhooks((prev) => prev.map((w) => w.id === updated.id ? updated : w))
    } catch {
      toast.error('Failed to update webhook')
    }
  }

  async function deleteWebhook(id: string) {
    setDeletingWebhookId(id)
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
      toast.success('Webhook deleted')
    } catch {
      toast.error('Failed to delete webhook')
    } finally {
      setDeletingWebhookId(null)
    }
  }

  async function loadDeliveries(webhookId: string) {
    if (expandedWebhookId === webhookId) {
      setExpandedWebhookId(null)
      return
    }
    setExpandedWebhookId(webhookId)
    if (deliveries[webhookId]) return
    setLoadingDeliveries(webhookId)
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries`)
      if (res.ok) {
        const data = await res.json()
        setDeliveries((prev) => ({ ...prev, [webhookId]: data }))
      }
    } catch { /* non-fatal */ } finally {
      setLoadingDeliveries(null)
    }
  }

  async function fetchSuppressions(type: 'email' | 'domain') {
    try {
      const res = await fetch(`/api/suppressions?type=${type}`)
      if (!res.ok) return
      const data = await res.json()
      if (type === 'email') setEmailSuppressions(data)
      else setDomainSuppressions(data)
    } catch { /* non-fatal */ }
  }

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
    setDeletingSuppId(id)
    try {
      const res = await fetch(`/api/suppressions/${id}?type=${type}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      if (type === 'email') setEmailSuppressions((p) => p.filter((s) => s.id !== id))
      else setDomainSuppressions((p) => p.filter((s) => s.id !== id))
    } catch {
      toast.error('Failed to remove')
    } finally {
      setDeletingSuppId(null)
    }
  }

  async function fetchWorkspaces() {
    try {
      const res = await fetch('/api/workspaces')
      if (res.ok) setWorkspaces(await res.json())
    } catch { /* non-fatal */ }
  }

  async function createWorkspace() {
    if (!newWorkspaceName.trim()) return
    setCreatingWorkspace(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create')
      setWorkspaces((prev) => [...prev, { ...json, role: 'owner' }])
      setNewWorkspaceName('')
      toast.success('Workspace created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreatingWorkspace(false)
    }
  }

  async function sendInvite(workspaceId: string) {
    if (!inviteEmail.trim()) return
    setInvitingToWorkspace(workspaceId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'member' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to invite')
      setInviteEmail('')
      toast.success(`Invite sent to ${inviteEmail.trim()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInvitingToWorkspace(null)
    }
  }

  async function fetchBillingData() {
    try {
      const res = await fetch('/api/billing/status')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId: 'pro' | 'team') {
    setUpgrading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
      setUpgrading(null)
    }
  }

  async function handlePortal() {
    setPortaling(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to open portal')
      window.location.href = json.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
      setPortaling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentPlan = data?.plan ?? 'free_trial'
  const isPaid = currentPlan === 'pro' || currentPlan === 'team'
  const isExpired = data?.is_expired ?? false
  const periodLabel = data?.limits.period === 'week' ? 'week' : 'month'
  const searchUsage = data?.usage.searches_count ?? 0
  const emailUsage = data?.usage.emails_sent_count ?? 0
  const searchLimit = data?.limits.searchLimit ?? 0
  const emailLimit = data?.limits.emailLimit ?? 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your plan, usage, and preferences</p>
      </div>

      {/* Current Plan Status */}
      <Card className={isExpired ? 'border-destructive' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = PLAN_ICONS[currentPlan]
                return <Icon className="h-5 w-5 text-primary" />
              })()}
              <CardTitle>{planDisplayName(currentPlan)} Plan</CardTitle>
            </div>
            <Badge variant={isExpired ? 'destructive' : isPaid ? 'default' : 'secondary'}>
              {isExpired ? 'Expired' : isPaid ? 'Active' : `${data?.trial_days_remaining ?? 0}d left`}
            </Badge>
          </div>
          <CardDescription>
            {isExpired
              ? 'Your free trial has expired. Upgrade to continue using Prospector.'
              : currentPlan === 'free_trial'
              ? `Trial ends in ${data?.trial_days_remaining ?? 0} day${data?.trial_days_remaining === 1 ? '' : 's'} — ${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/week · ${data?.limits.emailLimit} emails/week`
              : `${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/mo · ${data?.limits.emailLimit} emails/mo`}
          </CardDescription>
        </CardHeader>
        {isPaid && (
          <CardContent>
            <div className="flex items-center gap-3">
              {data?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(data.current_period_end).toLocaleDateString()}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                Manage Billing
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pricing Plans */}
      {!isPaid && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['pro', 'team'] as const).map((planId) => {
              const meta = PLAN_META[planId]
              const limits = PLAN_LIMITS[planId]
              const isRecommended = meta.recommended
              const features = [
                `${limits.mileLimit} mile search radius`,
                `${limits.searchLimit} searches / month`,
                `${limits.emailLimit} emails / month`,
                `${limits.generationLimit} AI generations / month`,
                planId === 'team' ? 'Priority support' : 'Email discovery',
              ]

              return (
                <Card
                  key={planId}
                  className={isRecommended ? 'border-primary ring-1 ring-primary relative' : 'relative'}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="flex items-center gap-1 px-3">
                        <Star className="h-3 w-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{meta.name}</CardTitle>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${meta.price}</p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <CardDescription>{meta.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isRecommended ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(planId)}
                      disabled={upgrading !== null}
                    >
                      {upgrading === planId ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting...</>
                      ) : (
                        <>
                          {planId === 'pro' ? <Zap className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                          Get {meta.name}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Usage This {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}
          </CardTitle>
          <CardDescription>
            Resets {data?.limits.period === 'week' ? 'every Monday' : 'on the 1st of each month'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Searches</span>
              <span className="font-medium">
                {searchUsage} / {searchLimit}
              </span>
            </div>
            <Progress
              value={Math.min((searchUsage / searchLimit) * 100, 100)}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Emails Sent</span>
              <span className="font-medium">
                {emailUsage} / {emailLimit}
              </span>
            </div>
            <Progress
              value={Math.min((emailUsage / emailLimit) * 100, 100)}
              className="h-2"
            />
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Search radius limit: {data?.limits.mileLimit ?? 20} miles
          </div>
        </CardContent>
      </Card>

      {/* Sender Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Sender Profile
          </CardTitle>
          <CardDescription>
            Your name and address appear in the footer of every outreach email you send, as required by CAN-SPAM law.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Your Name</Label>
            <Input
              id="full_name"
              placeholder="Jane Smith"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              placeholder="Acme LLC"
              value={profile.company_name}
              onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mailing_address">Mailing Address</Label>
            <Input
              id="mailing_address"
              placeholder="123 Main St · Austin, TX 78701"
              value={profile.mailing_address}
              onChange={(e) => setProfile((p) => ({ ...p, mailing_address: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking_link" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Booking Link
              <span className="text-xs text-muted-foreground font-normal ml-1">(appended to sequence emails — optional)</span>
            </Label>
            <Input
              id="booking_link"
              placeholder="https://calendly.com/yourname"
              value={profile.booking_link}
              onChange={(e) => setProfile((p) => ({ ...p, booking_link: e.target.value }))}
            />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>Receive real-time HTTP POST notifications when events occur in your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Endpoint URL</Label>
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
                      onClick={() => {
                        setWebhookEvents((prev) =>
                          active ? prev.filter((e) => e !== value) : [...prev, value]
                        )
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <Button size="sm" onClick={addWebhook} disabled={savingWebhook}>
              {savingWebhook ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Add Webhook
            </Button>
          </div>

          {webhooks.length > 0 && (
            <div className="space-y-2">
              {webhooks.map((wh) => (
                <div key={wh.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{wh.url}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {wh.events.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleWebhook(wh)}
                        className="text-muted-foreground hover:text-foreground"
                        title={wh.active ? 'Disable' : 'Enable'}
                      >
                        {wh.active
                          ? <ToggleRight className="h-5 w-5 text-primary" />
                          : <ToggleLeft className="h-5 w-5" />
                        }
                      </button>
                      <button
                        onClick={() => loadDeliveries(wh.id)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      >
                        {expandedWebhookId === wh.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteWebhook(wh.id)}
                        disabled={deletingWebhookId === wh.id}
                        className="text-destructive hover:text-destructive/80"
                      >
                        {deletingWebhookId === wh.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>
                  {expandedWebhookId === wh.id && (
                    <div className="border-t bg-muted/30 p-3 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Deliveries</p>
                      {loadingDeliveries === wh.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (deliveries[wh.id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No deliveries yet</p>
                      ) : (
                        (deliveries[wh.id] ?? []).map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-xs">
                            <span className={d.success ? 'text-green-600' : 'text-destructive'}>
                              {d.success ? '✓' : '✗'}
                            </span>
                            <span className="font-mono">{d.event}</span>
                            <span className="text-muted-foreground">{d.status_code ?? '—'}</span>
                            <span className="text-muted-foreground ml-auto">
                              {new Date(d.created_at).toLocaleString()}
                            </span>
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

      {/* Suppression List */}
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
            {emailSuppressions.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {emailSuppressions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="font-mono text-xs">{s.email}</span>
                    <button
                      onClick={() => removeSuppression(s.id, 'email')}
                      disabled={deletingSuppId === s.id}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      {deletingSuppId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {emailSuppressions.length === 0 && (
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
            {domainSuppressions.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {domainSuppressions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="font-mono text-xs">@{s.domain}</span>
                    <button
                      onClick={() => removeSuppression(s.id, 'domain')}
                      disabled={deletingSuppId === s.id}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      {deletingSuppId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {domainSuppressions.length === 0 && (
              <p className="text-xs text-muted-foreground">No suppressed domains yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team / Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team &amp; Workspaces
          </CardTitle>
          <CardDescription>Collaborate with teammates by creating shared workspaces</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspaces.length > 0 && (
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <div key={ws.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">/{ws.slug} · {ws.role}</p>
                    </div>
                    <Badge variant={ws.role === 'owner' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {ws.role}
                    </Badge>
                  </div>
                  {(ws.role === 'owner' || ws.role === 'admin') && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Invite by email"
                        value={invitingToWorkspace === ws.id ? inviteEmail : ''}
                        onChange={(e) => {
                          setInvitingToWorkspace(ws.id)
                          setInviteEmail(e.target.value)
                        }}
                        className="h-7 text-xs flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && sendInvite(ws.id)}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => sendInvite(ws.id)}
                        disabled={invitingToWorkspace === ws.id && !inviteEmail.trim()}
                      >
                        Invite
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="New workspace name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={createWorkspace} disabled={creatingWorkspace || !newWorkspaceName.trim()}>
              {creatingWorkspace ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Data & Privacy Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data &amp; Privacy
          </CardTitle>
          <CardDescription>Export or permanently delete your account data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Download a copy of all your data including searches, leads, and outreach history.
            </p>
            <Button variant="outline" onClick={exportData} disabled={exporting} className="w-fit">
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export My Data
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <Button variant="destructive" onClick={deleteAccount} disabled={deleting} className="w-fit">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete My Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
