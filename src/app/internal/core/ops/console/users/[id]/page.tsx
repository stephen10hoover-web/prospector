'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, CreditCard, Activity, StickyNote,
  AlertTriangle, Ban, Trash2, Loader2, Plus, X, Check,
  RefreshCw, Clock, Shield, Eye,
} from 'lucide-react'
import type { AdminUserDetail, AdminNote } from '@/types/admin'
import type { PlanId } from '@/lib/plans'
import { PLAN_META } from '@/lib/plans'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AdminBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {label}
    </span>
  )
}

const PLAN_BADGE: Record<PlanId, string> = {
  free_trial: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pro:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  team:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

function TypedConfirmDialog({
  open,
  title,
  description,
  confirmPhrase,
  confirmLabel,
  confirmClass,
  extraFields,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmPhrase: string
  confirmLabel: string
  confirmClass: string
  extraFields?: React.ReactNode
  onConfirm: (extras: Record<string, string>) => Promise<void>
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)
  const [extras, setExtras] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) { setTyped(''); setExtras({}); setLoading(false) }
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (typed !== confirmPhrase) return
    setLoading(true)
    try { await onConfirm({ ...extras, confirmation: typed }) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-xl p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-white/60">{description}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {extraFields && (
            <div onClick={(e) => e.stopPropagation()}>
              {/* inject extra fields via context — pass setter via children pattern */}
              {/* This simplified version passes setExtras down — see usage below */}
            </div>
          )}
          <div>
            <label className="text-xs text-white/50 block mb-1">
              Type <span className="font-mono text-white/80">{confirmPhrase}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
              placeholder={confirmPhrase}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={typed !== confirmPhrase || loading}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${confirmClass}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : confirmLabel}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialog with reason field
// ---------------------------------------------------------------------------

function ReasonDialog({
  open,
  title,
  confirmPhrase,
  confirmLabel,
  confirmClass,
  onConfirm,
  onClose,
  showSuspendUntil,
}: {
  open: boolean
  title: string
  confirmPhrase: string
  confirmLabel: string
  confirmClass: string
  onConfirm: (reason: string, suspendUntil?: string) => Promise<void>
  onClose: () => void
  showSuspendUntil?: boolean
}) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [suspendUntil, setSuspendUntil] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) { setTyped(''); setReason(''); setSuspendUntil(''); setLoading(false) }
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (typed !== confirmPhrase || !reason.trim()) return
    setLoading(true)
    try { await onConfirm(reason, suspendUntil || undefined) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-xl p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Reason (internal only)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-none"
              placeholder="Explain why..."
            />
          </div>
          {showSuspendUntil && (
            <div>
              <label className="text-xs text-white/50 block mb-1">Suspend until (optional — leave blank for indefinite)</label>
              <input
                type="date"
                value={suspendUntil}
                onChange={(e) => setSuspendUntil(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-white/50 block mb-1">
              Type <span className="font-mono text-white/80">{confirmPhrase}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
              placeholder={confirmPhrase}
            />
          </div>
          <button
            type="submit"
            disabled={typed !== confirmPhrase || !reason.trim() || loading}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${confirmClass}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : confirmLabel}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Plan override dialog
// ---------------------------------------------------------------------------

function PlanDialog({
  open,
  userEmail,
  onConfirm,
  onClose,
}: {
  open: boolean
  userEmail: string
  onConfirm: (plan: PlanId, reason: string) => Promise<void>
  onClose: () => void
}) {
  const [plan, setPlan] = useState<PlanId>('pro')
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) { setPlan('pro'); setReason(''); setTyped(''); setLoading(false) }
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (typed !== userEmail || !reason.trim()) return
    setLoading(true)
    try { await onConfirm(plan, reason) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-xl p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-white">Override Plan</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/70"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">New plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanId)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            >
              {(Object.keys(PLAN_META) as PlanId[]).map((p) => (
                <option key={p} value={p} className="bg-[#111114]">{PLAN_META[p].name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
              placeholder="e.g. Courtesy upgrade for bug impact"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">
              Type <span className="font-mono text-white/80">{userEmail}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
              placeholder={userEmail}
            />
          </div>
          <button
            type="submit"
            disabled={typed !== userEmail || !reason.trim() || loading}
            className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Override Plan'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Note state
  const [noteBody, setNoteBody] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Trial extend
  const [trialDays, setTrialDays] = useState('7')
  const [trialReason, setTrialReason] = useState('')
  const [extendingTrial, setExtendingTrial] = useState(false)

  // Dialogs
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [impersonateOpen, setImpersonateOpen] = useState(false)
  const [impersonateConfirm, setImpersonateConfirm] = useState('')
  const [impersonating, setImpersonating] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/internal/users/${id}`)
      if (!res.ok) throw new Error('User not found')
      const data = await res.json()
      setUser(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchUser() }, [fetchUser])

  async function addNote() {
    if (!noteBody.trim()) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/internal/users/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteBody.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const { note } = await res.json()
      setUser((u) => u ? { ...u, notes: [note, ...u.notes] } : u)
      setNoteBody('')
    } finally {
      setAddingNote(false)
    }
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/internal/users/${id}/notes?note_id=${noteId}`, { method: 'DELETE' })
    setUser((u) => u ? { ...u, notes: u.notes.filter((n) => n.id !== noteId) } : u)
  }

  async function extendTrial() {
    if (!trialReason.trim()) return
    setExtendingTrial(true)
    try {
      const res = await fetch(`/api/internal/users/${id}/trial`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: parseInt(trialDays), reason: trialReason }),
      })
      if (!res.ok) throw new Error('Failed')
      await fetchUser()
      setTrialDays('7')
      setTrialReason('')
    } finally {
      setExtendingTrial(false)
    }
  }

  async function handleSuspend(reason: string, suspendUntil?: string) {
    const res = await fetch(`/api/internal/users/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, suspend_until: suspendUntil, confirmation: 'SUSPEND' }),
    })
    if (!res.ok) throw new Error('Failed to suspend')
    setSuspendOpen(false)
    await fetchUser()
  }

  async function handleUnsuspend() {
    await fetch(`/api/internal/users/${id}/unsuspend`, { method: 'POST' })
    await fetchUser()
  }

  async function handleBan(reason: string) {
    const res = await fetch(`/api/internal/users/${id}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, confirmation: 'BAN' }),
    })
    if (!res.ok) throw new Error('Failed to ban')
    setBanOpen(false)
    await fetchUser()
  }

  async function handleUnban() {
    await fetch(`/api/internal/users/${id}/unban`, { method: 'POST' })
    await fetchUser()
  }

  async function handleImpersonate() {
    if (impersonateConfirm !== 'IMPERSONATE') return
    setImpersonating(true)
    try {
      const res = await fetch(`/api/internal/users/${id}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'IMPERSONATE' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.href = data.redirect_url
    } catch (e) {
      alert((e as Error).message)
      setImpersonating(false)
    }
  }

  async function handlePlanOverride(plan: PlanId, reason: string) {
    const res = await fetch(`/api/internal/users/${id}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, reason, confirmation: user?.email }),
    })
    if (!res.ok) throw new Error('Failed')
    setPlanOpen(false)
    await fetchUser()
  }

  async function handleDelete() {
    const res = await fetch(`/api/internal/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: user?.email }),
    })
    if (!res.ok) throw new Error('Failed to delete')
    setDeleteOpen(false)
    router.push('/internal/core/ops/console/users')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="text-center py-24">
        <p className="text-white/40">{error ?? 'User not found'}</p>
        <Link href="/internal/core/ops/console/users" className="text-sm text-white/30 hover:text-white/60 mt-4 inline-block">
          ← Back to Users
        </Link>
      </div>
    )
  }

  const planBadge = PLAN_BADGE[user.plan as PlanId] ?? 'bg-white/10 text-white/50 border-white/10'

  return (
    <>
      {/* Dialogs */}
      <ReasonDialog
        open={suspendOpen}
        title="Suspend User"
        confirmPhrase="SUSPEND"
        confirmLabel="Suspend Account"
        confirmClass="bg-yellow-600 hover:bg-yellow-500 text-white"
        showSuspendUntil
        onConfirm={handleSuspend}
        onClose={() => setSuspendOpen(false)}
      />
      <ReasonDialog
        open={banOpen}
        title="Ban User Permanently"
        confirmPhrase="BAN"
        confirmLabel="Ban Account"
        confirmClass="bg-red-700 hover:bg-red-600 text-white"
        onConfirm={handleBan}
        onClose={() => setBanOpen(false)}
      />
      <PlanDialog
        open={planOpen}
        userEmail={user.email}
        onConfirm={handlePlanOverride}
        onClose={() => setPlanOpen(false)}
      />

      {/* Impersonate confirmation */}
      {impersonateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setImpersonateOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-white">View as {user.email}</h3>
              <button onClick={() => setImpersonateOpen(false)} className="text-white/40 hover:text-white/70"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-white/60">
              This opens the app in &quot;view as&quot; mode. The impersonation banner will be visible. Your data is never swapped — you see your own data, not the user&apos;s.
            </p>
            <div>
              <label className="text-xs text-white/50 block mb-1">Type <span className="font-mono text-white/80">IMPERSONATE</span> to confirm</label>
              <input
                type="text"
                value={impersonateConfirm}
                onChange={(e) => setImpersonateConfirm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="IMPERSONATE"
                autoFocus
              />
            </div>
            <button
              onClick={handleImpersonate}
              disabled={impersonateConfirm !== 'IMPERSONATE' || impersonating}
              className="w-full py-2 rounded-lg text-sm bg-white/10 text-white hover:bg-white/15 transition-colors disabled:opacity-40"
            >
              {impersonating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Start View Session'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-md bg-[#111114] border border-white/10 rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-red-400">Delete Account Permanently</h3>
            <p className="text-sm text-white/60">
              This will permanently delete all data for <span className="text-white font-mono">{user.email}</span> — leads, emails, sequences, everything. This cannot be undone.
            </p>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                Type <span className="font-mono text-white/80">{user.email}</span> to confirm
              </label>
              <DeleteConfirmInput
                userEmail={user.email}
                onConfirm={handleDelete}
                onClose={() => setDeleteOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/internal/core/ops/console/users"
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{user.email}</h1>
            <p className="text-sm text-white/30 mt-0.5">
              Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminBadge label={PLAN_META[user.plan as PlanId]?.name ?? user.plan} color={planBadge} />
            {user.is_banned && <AdminBadge label="BANNED" color="bg-red-500/20 text-red-300 border-red-500/30" />}
            {!user.is_banned && user.is_suspended && <AdminBadge label="SUSPENDED" color="bg-yellow-500/20 text-yellow-300 border-yellow-500/30" />}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Account overview */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Usage Stats</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Leads', value: user.total_leads.toLocaleString() },
                  { label: 'Emails Sent', value: user.total_emails_sent.toLocaleString() },
                  { label: 'Searches', value: user.total_searches.toLocaleString() },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                    <p className="text-xs text-white/30 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Subscription</h2>
                </div>
                <button
                  onClick={() => setPlanOpen(true)}
                  className="text-xs px-2.5 py-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition-colors"
                >
                  Override Plan
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Plan</span>
                  <span className="text-white font-medium">{PLAN_META[user.plan as PlanId]?.name ?? user.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Status</span>
                  <span className="text-white/80">{user.status}</span>
                </div>
                {user.trial_ends_at && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Trial Ends</span>
                    <span className="text-white/80">{new Date(user.trial_ends_at).toLocaleDateString()}</span>
                  </div>
                )}
                {user.current_period_end && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Period End</span>
                    <span className="text-white/80">{new Date(user.current_period_end).toLocaleDateString()}</span>
                  </div>
                )}
                {user.sending_email && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Sending Email</span>
                    <span className="text-white/60 font-mono text-xs">{user.sending_email}</span>
                  </div>
                )}
                {user.last_sign_in_at && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Last Sign-in</span>
                    <span className="text-white/60">{new Date(user.last_sign_in_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trial extension */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Extend Trial</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
                  placeholder="Days"
                />
                <input
                  value={trialReason}
                  onChange={(e) => setTrialReason(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  placeholder="Reason (required)"
                />
                <button
                  onClick={extendTrial}
                  disabled={extendingTrial || !trialReason.trim()}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 text-sm transition-colors disabled:opacity-40"
                >
                  {extendingTrial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right column — notes + actions */}
          <div className="space-y-4">
            {/* Admin notes */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Admin Notes</h2>
              </div>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {user.notes.length === 0 && (
                  <p className="text-xs text-white/30 text-center py-3">No notes yet</p>
                )}
                {user.notes.map((note: AdminNote) => (
                  <div key={note.id} className="bg-white/5 rounded-lg p-2.5 group">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-white/30">{note.admin_email}</span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-white/70">{note.body}</p>
                    <p className="text-xs text-white/20 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addNote()}
                />
                <button
                  onClick={addNote}
                  disabled={addingNote || !noteBody.trim()}
                  className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-40 transition-colors"
                >
                  {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Actions</h2>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setImpersonateOpen(true)}
                  className="w-full py-2 rounded-lg text-sm bg-white/5 text-white/60 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View as User
                </button>

                {user.is_suspended ? (
                  <button
                    onClick={handleUnsuspend}
                    className="w-full py-2 rounded-lg text-sm bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Unsuspend
                  </button>
                ) : (
                  <button
                    onClick={() => setSuspendOpen(true)}
                    disabled={user.is_banned}
                    className="w-full py-2 rounded-lg text-sm bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Suspend
                  </button>
                )}

                {user.is_banned ? (
                  <button
                    onClick={handleUnban}
                    className="w-full py-2 rounded-lg text-sm bg-green-900/30 text-green-300 hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => setBanOpen(true)}
                    className="w-full py-2 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Ban Permanently
                  </button>
                )}

                <button
                  onClick={() => setDeleteOpen(true)}
                  className="w-full py-2 rounded-lg text-sm bg-red-950/50 text-red-500 hover:bg-red-950 transition-colors flex items-center justify-center gap-2 border border-red-900/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Separate component to manage typed-confirmation state for delete dialog
function DeleteConfirmInput({
  userEmail,
  onConfirm,
  onClose,
}: {
  userEmail: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (typed !== userEmail) return
    setLoading(true)
    try { await onConfirm() }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
        placeholder={userEmail}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={typed !== userEmail || loading}
          className="flex-1 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Delete Permanently'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
