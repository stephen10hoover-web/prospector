'use client'

/**
 * PostHog analytics provider.
 *
 * Handles: session replay, heatmaps, funnels, cohort analysis, A/B testing.
 * Configure at: app.posthog.com (or self-host with Docker).
 *
 * Required env vars:
 *   NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
 *   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com  (or your self-hosted URL)
 */

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!POSTHOG_KEY) return
    // Don't track admin routes
    if (pathname.startsWith('/internal/')) return

    const url = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,     // we handle this manually above
      capture_pageleave: true,
      session_recording: {
        // Mask sensitive inputs automatically
        maskAllInputs: false,
        maskInputOptions: { password: true, email: false },
      },
      // Never capture on admin routes
      before_send: (event) => {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/internal/')) {
          return null // drop the event
        }
        return event
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })
  }, [])

  if (!POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}
