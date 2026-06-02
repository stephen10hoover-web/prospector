'use client'

// Self-contained notification banner system.
// Fetches /api/billing/status once on mount, priority-resolves which banner
// to show (or none), and renders it above the page content.
// One banner at a time — no stacked banners.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TrialExpiringBanner } from './TrialExpiringBanner'
import { UsageWarningBanner } from './UsageWarningBanner'
import { PaymentFailedBanner } from './PaymentFailedBanner'
import { CancellationConfirmedBanner } from './CancellationConfirmedBanner'
import { TrialExpiredOverlay } from './TrialExpiredOverlay'
import type { PlanId } from '@/lib/plans'

interface BillingStatus {
  plan: PlanId
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  is_expired: boolean
  trial_days_remaining: number | null
  usage: { searches_count: number; emails_sent_count: number }
  limits: { searchLimit: number; emailLimit: number; period: 'week' | 'month' }
}

const DISMISS_TTL: Record<string, number> = {
  trial3: 24 * 60 * 60 * 1000,
  usage75: 24 * 60 * 60 * 1000,
  cancelled: 7 * 24 * 60 * 60 * 1000,
}

function isDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(`prospector_banner_${key}_dismissed_at`)
  if (!stored) return false
  const ttl = DISMISS_TTL[key] ?? 24 * 60 * 60 * 1000
  return Date.now() - parseInt(stored, 10) < ttl
}

function dismiss(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`prospector_banner_${key}_dismissed_at`, Date.now().toString())
  }
}

// Paths where the expired overlay should NOT render so the user can upgrade/manage billing
const OVERLAY_BYPASS_PATHS = ['/settings', '/pricing']

export function NotificationBannerProvider() {
  const pathname = usePathname()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [bypassExpired, setBypassExpired] = useState(false)

  useEffect(() => {
    // Restore sessionStorage bypass for expired-trial read-only mode
    if (typeof window !== 'undefined') {
      setBypassExpired(sessionStorage.getItem('prospector_trial_expired_bypass') === 'true')
    }

    fetch('/api/billing/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStatus(data))
      .catch(() => null)
  }, [])

  if (!status) return null

  const searchPct = status.limits.searchLimit > 0
    ? (status.usage.searches_count / status.limits.searchLimit) * 100
    : 0
  const emailPct = status.limits.emailLimit > 0
    ? (status.usage.emails_sent_count / status.limits.emailLimit) * 100
    : 0
  const maxUsagePct = Math.max(searchPct, emailPct)

  const searchesRemaining = Math.max(0, status.limits.searchLimit - status.usage.searches_count)
  const emailsRemaining = Math.max(0, status.limits.emailLimit - status.usage.emails_sent_count)

  const isAllowedPath = OVERLAY_BYPASS_PATHS.some((p) => pathname.startsWith(p))

  function handleDismiss(key: string) {
    dismiss(key)
    setDismissed((prev) => { const next = new Set(Array.from(prev)); next.add(key); return next })
  }

  function handleBypass() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('prospector_trial_expired_bypass', 'true')
    }
    setBypassExpired(true)
  }

  // Priority 1 — Trial expired wall
  if (status.is_expired && !isAllowedPath && !bypassExpired) {
    return (
      <TrialExpiredOverlay
        searchesCount={status.usage.searches_count}
        emailsCount={status.usage.emails_sent_count}
        onBypass={handleBypass}
      />
    )
  }

  // Priority 2 — Payment failed (not dismissible)
  if (status.status === 'past_due') {
    return <PaymentFailedBanner />
  }

  // Priority 3 — Usage at 90%+ (not dismissible)
  if (maxUsagePct >= 90) {
    return (
      <UsageWarningBanner
        searchPct={searchPct}
        emailPct={emailPct}
        searchesRemaining={searchesRemaining}
        emailsRemaining={emailsRemaining}
        period={status.limits.period}
      />
    )
  }

  // Priority 4 — Trial ends tomorrow (not dismissible)
  if (
    status.plan === 'free_trial' &&
    status.trial_days_remaining !== null &&
    status.trial_days_remaining <= 1 &&
    !status.is_expired
  ) {
    return <TrialExpiringBanner daysRemaining={1} />
  }

  // Priority 5 — Usage at 75–89% (dismissible, 24h)
  if (maxUsagePct >= 75 && !dismissed.has('usage75') && !isDismissed('usage75')) {
    return (
      <UsageWarningBanner
        searchPct={searchPct}
        emailPct={emailPct}
        searchesRemaining={searchesRemaining}
        emailsRemaining={emailsRemaining}
        period={status.limits.period}
        onDismiss={() => handleDismiss('usage75')}
      />
    )
  }

  // Priority 6 — Trial ends in 2–3 days (dismissible, 24h)
  if (
    status.plan === 'free_trial' &&
    status.trial_days_remaining !== null &&
    status.trial_days_remaining <= 3 &&
    status.trial_days_remaining > 1 &&
    !dismissed.has('trial3') &&
    !isDismissed('trial3')
  ) {
    return (
      <TrialExpiringBanner
        daysRemaining={status.trial_days_remaining}
        onDismiss={() => handleDismiss('trial3')}
      />
    )
  }

  // Priority 7 — Cancellation confirmed (dismissible, 7 days)
  if (
    status.cancel_at_period_end &&
    status.status !== 'past_due' &&
    !status.is_expired &&
    status.current_period_end &&
    !dismissed.has('cancelled') &&
    !isDismissed('cancelled')
  ) {
    return (
      <CancellationConfirmedBanner
        periodEndDate={status.current_period_end}
        onDismiss={() => handleDismiss('cancelled')}
      />
    )
  }

  return null
}
