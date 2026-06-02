'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { BannerShell } from './BannerShell'
import { Button } from '@/components/ui/button'

interface CancellationConfirmedBannerProps {
  periodEndDate: string
  onDismiss: () => void
}

export function CancellationConfirmedBanner({ periodEndDate, onDismiss }: CancellationConfirmedBannerProps) {
  const [reactivating, setReactivating] = useState(false)
  const dateStr = new Date(periodEndDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  async function handleReactivate() {
    setReactivating(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (json.url) window.location.href = json.url
    } catch {
      // Fallback: send to settings
      window.location.href = '/settings'
    } finally {
      setReactivating(false)
    }
  }

  return (
    <BannerShell variant="muted" dismissible onDismiss={onDismiss}>
      <div className="flex items-center gap-3 flex-wrap">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          Subscription cancelled. You have full access until{' '}
          <span className="font-medium">{dateStr}</span>.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReactivate}
          disabled={reactivating}
          className="h-7 px-3 text-xs shrink-0"
        >
          {reactivating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Reactivate
        </Button>
        <Link href="/pricing" className="text-xs underline underline-offset-2 hover:no-underline shrink-0">
          See plans
        </Link>
      </div>
    </BannerShell>
  )
}
