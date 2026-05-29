'use client'

/**
 * Client-side event tracking.
 *
 * Fires events to:
 *   1. /api/track/event  — our internal DB (analytics_events table)
 *   2. PostHog           — if NEXT_PUBLIC_POSTHOG_KEY is configured
 *
 * Usage:
 *   import { track } from '@/lib/track'
 *   track('signup_completed', { plan: 'pro' })
 */

let _sessionId: string | null = null

function getSessionId(): string {
  if (_sessionId) return _sessionId

  try {
    const stored = sessionStorage.getItem('__ps_sid')
    if (stored) { _sessionId = stored; return stored }

    // Generate a new session ID (nanoid-style)
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    sessionStorage.setItem('__ps_sid', id)
    _sessionId = id
    return id
  } catch {
    return 'unknown'
  }
}

function getAnonymousId(): string {
  try {
    const stored = localStorage.getItem('__ps_aid')
    if (stored) return stored
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    localStorage.setItem('__ps_aid', id)
    return id
  } catch {
    return 'unknown'
  }
}

export function track(eventName: string, properties: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return

  const payload = {
    event_name: eventName,
    session_id: getSessionId(),
    anonymous_id: getAnonymousId(),
    properties,
    url: window.location.href,
    referrer: document.referrer || undefined,
  }

  // Fire to internal endpoint (best-effort, non-blocking)
  fetch('/api/track/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})

  // Forward to PostHog if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = (window as any).posthog
    if (ph?.capture) {
      ph.capture(eventName, properties)
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Standard event helpers — call these at the right moments in your app
// ---------------------------------------------------------------------------

export const trackEvents = {
  signupStarted:          () => track('signup_started'),
  signupCompleted:        (props?: Record<string, unknown>) => track('signup_completed', props ?? {}),
  loginCompleted:         () => track('login_completed'),
  pricingViewed:          () => track('pricing_viewed'),
  checkoutStarted:        (plan: string) => track('checkout_started', { plan }),
  checkoutAbandoned:      (plan: string) => track('checkout_abandoned', { plan }),
  subscriptionStarted:    (plan: string) => track('subscription_started', { plan }),
  subscriptionCancelled:  (plan: string) => track('subscription_cancelled', { plan }),
  searchPerformed:        (props: { radius: number; category: string }) => track('search_performed', props),
  emailSent:              () => track('email_sent'),
  leadViewed:             (leadId: string) => track('lead_viewed', { leadId }),
  featureUsed:            (feature: string) => track('feature_used', { feature }),
  buttonClicked:          (label: string, context?: string) => track('button_clicked', { label, context }),
  errorOccurred:          (code: string, context?: string) => track('error_occurred', { code, context }),
  trialExpired:           () => track('trial_expired'),
  upgradePromptViewed:    (trigger: string) => track('upgrade_prompt_viewed', { trigger }),
}
