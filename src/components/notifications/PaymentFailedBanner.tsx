'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { BannerShell } from './BannerShell'
import { Button } from '@/components/ui/button'

export function PaymentFailedBanner() {
  const [loading, setLoading] = useState(false)

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (json.url) window.location.href = json.url
    } catch {
      // Silently fail — user can go to settings manually
    } finally {
      setLoading(false)
    }
  }

  return (
    <BannerShell variant="red">
      <div className="flex items-center gap-3 flex-wrap">
        <CreditCard className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          <span className="font-medium">Payment failed.</span>{' '}
          Update your payment method to keep your account active.
        </span>
        <Button
          size="sm"
          variant="default"
          onClick={handlePortal}
          disabled={loading}
          className="h-7 px-3 text-xs shrink-0 bg-red-600 hover:bg-red-700"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Update Payment
        </Button>
      </div>
    </BannerShell>
  )
}
