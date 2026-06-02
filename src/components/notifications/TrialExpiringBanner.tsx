'use client'

import Link from 'next/link'
import { Clock, AlertCircle } from 'lucide-react'
import { BannerShell } from './BannerShell'

interface TrialExpiringBannerProps {
  daysRemaining: number
  onDismiss?: () => void  // only provided when daysRemaining > 1
}

export function TrialExpiringBanner({ daysRemaining, onDismiss }: TrialExpiringBannerProps) {
  const isUrgent = daysRemaining <= 1

  if (isUrgent) {
    // Tomorrow — not dismissible
    return (
      <BannerShell variant="orange">
        <div className="flex items-center gap-3 flex-wrap">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            Your trial ends tomorrow.{' '}
            <span className="font-normal">
              Upgrade before midnight to keep your leads and outreach history.
            </span>
          </span>
          <Link
            href="/pricing"
            className="text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0"
          >
            Upgrade Before It Expires →
          </Link>
        </div>
      </BannerShell>
    )
  }

  // 2–3 days — dismissible
  return (
    <BannerShell variant="amber" dismissible onDismiss={onDismiss}>
      <div className="flex items-center gap-3 flex-wrap">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          <span className="font-medium">Your trial ends in {daysRemaining} days.</span>{' '}
          Upgrade now so you don&apos;t lose your lead list and outreach history.
        </span>
        <Link
          href="/pricing"
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0"
        >
          Upgrade Now →
        </Link>
      </div>
    </BannerShell>
  )
}
