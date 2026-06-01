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
  cancel_at_period_end: boolean
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
  type WorkspaceMember = { user_id: string; email: string; role: string; created_at: string; is_self: boolean }
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; slug: string; role: string; created_at: string }[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({})
  const [inviteRole, setInviteRole] = useState<Record<string, 'admin' | 'member'>>({})
  const [invitingToWorkspace, setInvitingToWorkspace] = useState<string | null>(null)
  const [expandedWorkspaceId, setExpandedWorkspaceId] = useState<string | null>(null)
  const [membersCache, setMembersCache] = useState<Record<string, WorkspaceMember[]>>({})
  const [loadingMembersFor, setLoadingMembersFor] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null)

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

  async function loadMembers(workspaceId: string) {
    setLoadingMembersFor(workspaceId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`)
      if (res.ok) {
        const members = await res.json()
        setMembersCache((prev) => ({ ...prev, [workspaceId]: members }))
      }
    } finally {
      setLoadingMembersFor(null)
    }
  }

  function toggleWorkspace(workspaceId: string) {
    if (expandedWorkspaceId === workspaceId) {
      setExpandedWorkspaceId(null)
    } else {
      setExpandedWorkspaceId(workspaceId)
      if (!membersCache[workspaceId]) loadMembers(workspaceId)
    }
  }

  async function sendInvite(workspaceId: string) {
    const email = inviteEmail[workspaceId]?.trim()
    if (!email) return
    setInvitingToWorkspace(workspaceId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole[workspaceId] ?? 'member' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Invite sent')
      setInviteEmail((prev) => ({ ...prev, [workspaceId]: '' }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInvitingToWorkspace(null)
    }
  }

  async function removeMember(workspaceId: string, userId: string) {
    setRemovingMemberId(userId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setMembersCache((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).filter((m) => m.user_id !== userId),
      }))
      toast.success('Member removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function changeRole(workspaceId: string, userId: string, role: 'admin' | 'member') {
    setChangingRoleFor(userId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMembersCache((prev) => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] ?? []).map((m) =>
          m.user_id === userId ? { ...m, role } : m
        ),
      }))
      toast.success('Role updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setChangingRoleFor(null)
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
  const trialDaysRemaining = data?.trial_days_remaining ?? 0
  const trialIsUrgent = currentPlan === 'free_trial' && !isExpired && trialDaysRemaining <= 3
  const searchNearLimit = searchLimit > 0 && (searchUsage / searchLimit) >= 0.8
  const emailNearLimit = emailLimit > 0 && (emailUsage / emailLimit) >= 0.8
  const cancelAtPeriodEnd = data?.cancel_at_period_end ?? false
  const subscriptionStatus = data?.status ?? 'trialing'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your plan, usage, and preferences</p>
      </div>

      {/* Current Plan Status */}
      <Card className={isExpired ? 'border-destructive' : trialIsUrgent ? 'border-orange-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = PLAN_ICONS[currentPlan]
                return <Icon className="h-5 w-5 text-primary" />
              })()}
              <CardTitle>{planDisplayName(currentPlan)} Plan</CardTitle>
            </div>
            <Badge
              variant={
                isExpired || subscriptionStatus === 'canceled' || subscriptionStatus === 'past_due'
                  ? 'destructive'
                  : trialIsUrgent
                  ? 'secondary'
                  : isPaid
                  ? 'default'
                  : 'secondary'
              }
              className={
                subscriptionStatus === 'past_due'
                  ? 'bg-orange-500 hover:bg-orange-500 text-white border-0'
                  : trialIsUrgent
                  ? 'bg-orange-500 hover:bg-orange-500 text-white border-0'
                  : ''
              }
            >
              {isExpired
                ? 'Expired'
                : subscriptionStatus === 'canceled'
                ? 'Canceled'
                : subscriptionStatus === 'past_due'
                ? 'Past Due'
                : subscriptionStatus === 'trialing' || currentPlan === 'free_trial'
                ? trialIsUrgent
                  ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left!`
                  : `${trialDaysRemaining}d left`
                : 'Active'}
            </Badge>
          </div>
          <CardDescription>
            {isExpired
              ? 'Your free trial has expired. Upgrade to continue using Prospector.'
              : currentPlan === 'free_trial'
              ? `Trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} — ${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/week · ${data?.limits.emailLimit} emails/week`
              : `${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/mo · ${data?.limits.emailLimit} emails/mo`}
          </CardDescription>
        </CardHeader>

        {/* Trial urgency banner */}
        {trialIsUrgent && !isExpired && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm text-orange-600 dark:text-orange-400">
              Only {trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} left on your trial — upgrade now so you don&apos;t lose access to your lead list and outreach history.
            </div>
          </CardContent>
        )}

        {/* Cancellation loss-framing notice */}
        {cancelAtPeriodEnd && data?.current_period_end && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              <p className="font-semibold">
                Your subscription cancels on {new Date(data.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </p>
              <p className="mt-1 text-destructive/80">
                On that date you&apos;ll lose access to your full lead list, all email sequences, saved outreach templates, and your outreach history. Reactivate below to keep everything.
              </p>
              <Button size="sm" className="mt-2" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                Reactivate Subscription
              </Button>
            </div>
          </CardContent>
        )}

        {/* Past-due notice */}
        {subscriptionStatus === 'past_due' && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm text-orange-600 dark:text-orange-400">
              <p className="font-semibold">Your last payment failed.</p>
              <p className="mt-0.5">Update your payment method to keep access to your leads and sequences.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        )}

        {isPaid && !cancelAtPeriodEnd && subscriptionStatus !== 'past_due' && (
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

      {/* "View full pricing" link */}
      {!isPaid && (
        <p className="text-center text-xs text-muted-foreground -mt-2">
          <a href="/pricing" className="underline hover:text-foreground transition-colors">
            View full pricing comparison
          </a>
        </p>
      )}

      {/* Near-limit upgrade nudge — shown when usage is ≥80% on a free/trial plan */}
      {!isPaid && !isExpired && (searchNearLimit || emailNearLimit) && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">You&apos;re almost at your limit</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchNearLimit && emailNearLimit
                ? 'Your searches and emails are nearly used up.'
                : searchNearLimit
                ? `${searchUsage} of ${searchLimit} searches used this ${periodLabel}.`
                : `${emailUsage} of ${emailLimit} emails used this ${periodLabel}.`}
              {' '}Upgrade now to keep prospecting.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleUpgrade('pro')}
            disabled={upgrading !== null}
            className="shrink-0"
          >
            {upgrading === 'pro' ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 mr-1.5" />
            )}
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Expired trial upgrade nudge */}
      {isExpired && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-destructive">Your trial has ended</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upgrade to Pro to regain access to your {searchUsage} saved leads and outreach history.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => handleUpgrade('pro')}
            disabled={upgrading !== null}
            className="shrink-0"
          >
            {upgrading === 'pro' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
            Upgrade to Pro
          </Button>
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
              {workspaces.map((ws) => {
                const isExpanded = expandedWorkspaceId === ws.id
                const members = membersCache[ws.id] ?? []
                const isOwnerOrAdmin = ws.role === 'owner' || ws.role === 'admin'
                const isOwner = ws.role === 'owner'
                return (
                  <div key={ws.id} className="border rounded-lg overflow-hidden">
                    {/* Header row */}
                    <button
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                      onClick={() => toggleWorkspace(ws.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">{ws.name[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-none">{ws.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">/{ws.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs capitalize">
                          {ws.role}
                        </Badge>
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-3 py-3 space-y-3">
                        {/* Members list */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Members</p>
                          {loadingMembersFor === ws.id ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                            </div>
                          ) : members.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No members yet.</p>
                          ) : (
                            <div className="space-y-1">
                              {members.map((m) => (
                                <div key={m.user_id} className="flex items-center justify-between gap-2 py-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs truncate">{m.email}</span>
                                    {m.is_self && <span className="text-xs text-muted-foreground">(you)</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Role selector — only owner can change roles, not on themselves */}
                                    {isOwner && !m.is_self ? (
                                      <select
                                        value={m.role}
                                        disabled={changingRoleFor === m.user_id}
                                        onChange={(e) => changeRole(ws.id, m.user_id, e.target.value as 'admin' | 'member')}
                                        className="text-xs border rounded px-1.5 py-0.5 bg-background h-6 cursor-pointer disabled:opacity-50"
                                      >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                      </select>
                                    ) : (
                                      <Badge variant="outline" className="text-xs capitalize h-5 px-1.5">{m.role}</Badge>
                                    )}
                                    {/* Remove / Leave */}
                                    {(isOwnerOrAdmin && !m.is_self) || m.is_self ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        disabled={removingMemberId === m.user_id || changingRoleFor === m.user_id}
                                        onClick={() => removeMember(ws.id, m.user_id)}
                                        title={m.is_self ? 'Leave workspace' : 'Remove member'}
                                      >
                                        {removingMemberId === m.user_id
                                          ? <Loader2 className="h-3 w-3 animate-spin" />
                                          : <Trash2 className="h-3 w-3" />
                                        }
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Invite form — owners and admins */}
                        {isOwnerOrAdmin && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Invite</p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Email address"
                                type="email"
                                value={inviteEmail[ws.id] ?? ''}
                                onChange={(e) => setInviteEmail((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && sendInvite(ws.id)}
                                className="h-7 text-xs flex-1"
                              />
                              <select
                                value={inviteRole[ws.id] ?? 'member'}
                                onChange={(e) => setInviteRole((prev) => ({ ...prev, [ws.id]: e.target.value as 'admin' | 'member' }))}
                                className="text-xs border rounded px-1.5 py-0.5 bg-background h-7 cursor-pointer"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5"
                                onClick={() => sendInvite(ws.id)}
                                disabled={invitingToWorkspace === ws.id || !inviteEmail[ws.id]?.trim()}
                              >
                                {invitingToWorkspace === ws.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : 'Invite'
                                }
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Create workspace */}
          <div>
            {workspaces.length > 0 && <Separator className="mb-4" />}
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">New workspace</p>
            <div className="flex gap-2">
              <Input
                placeholder="Workspace name"
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
