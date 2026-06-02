'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Zap, Loader2 } from 'lucide-react'
import { BannerShell } from './BannerShell'
import { Button } from '@/components/ui/button'

interface UsageWarningBannerProps {
  searchPct: number
  emailPct: number
  searchesRemaining: number
  emailsRemaining: number
  period: 'week' | 'month'
  onDismiss?: () => void  // only provided for 75% variant
}

export function UsageWarningBanner({
  searchPct,
  emailPct,
  searchesRemaining,
  emailsRemaining,
  period,
  onDismiss,
}: UsageWarningBannerProps) {
  const router = useRouter()
  const [upgrading, setUpgrading] = useState(false)
  const maxPct = Math.max(searchPct, emailPct)
  const isCritical = maxPct >= 90
  const periodLabel = period === 'week' ? 'this week' : 'this month'
  const highResource = searchPct >= emailPct ? 'searches' : 'emails'
  const remaining = searchPct >= emailPct ? searchesRemaining : emailsRemaining

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      if (res.status === 503) { router.push('/pricing'); return }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      window.location.href = json.url
    } catch {
      router.push('/pricing')
    } finally {
      setUpgrading(false)
    }
  }

  if (isCritical) {
    return (
      <BannerShell variant="orange">
        <div className="flex items-center gap-3 flex-wrap">
          <Zap className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            <span className="font-medium">Almost out of {highResource}!</span>{' '}
            Only {remaining} {highResource} left {periodLabel}.
          </span>
          <Button size="sm" variant="default" onClick={handleUpgrade} disabled={upgrading} className="h-7 px-3 text-xs shrink-0">
            {upgrading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Upgrade Now
          </Button>
        </div>
      </BannerShell>
    )
  }

  return (
    <BannerShell variant="blue" dismissible onDismiss={onDismiss}>
      <div className="flex items-center gap-3 flex-wrap">
        <BarChart2 className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          <span className="font-medium">You&apos;ve used {Math.round(maxPct)}% of your {highResource}</span>{' '}
          {periodLabel}.{' '}
          {remaining} remaining.
        </span>
        <Link
          href="/pricing"
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0"
        >
          Upgrade for More →
        </Link>
      </div>
    </BannerShell>
  )
}
