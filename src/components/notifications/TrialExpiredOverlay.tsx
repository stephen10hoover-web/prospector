'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLAN_META, PLAN_LIMITS } from '@/lib/plans'

interface TrialExpiredOverlayProps {
  searchesCount: number
  emailsCount: number
  onBypass: () => void
}

export function TrialExpiredOverlay({ searchesCount, emailsCount, onBypass }: TrialExpiredOverlayProps) {
  const router = useRouter()
  const [upgrading, setUpgrading] = useState<'pro' | 'team' | null>(null)

  async function handleUpgrade(plan: 'pro' | 'team') {
    setUpgrading(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (res.status === 503) { router.push('/pricing'); return }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      window.location.href = json.url
    } catch {
      router.push('/pricing')
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 px-8 py-6 border-b">
          <h1 className="text-2xl font-bold tracking-tight">Your free trial has ended</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upgrade to get back in — everything you built is saved.
          </p>
        </div>

        {/* Usage preserved stats */}
        <div className="px-8 py-5 border-b bg-background">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            What&apos;s waiting for you
          </p>
          <div className="flex gap-6 flex-wrap">
            {searchesCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold">{searchesCount}</p>
                <p className="text-xs text-muted-foreground">leads saved</p>
              </div>
            )}
            {emailsCount > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold">{emailsCount}</p>
                <p className="text-xs text-muted-foreground">emails sent</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold">∞</p>
              <p className="text-xs text-muted-foreground">data preserved</p>
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['pro', 'team'] as const).map((planId) => {
            const meta = PLAN_META[planId]
            const limits = PLAN_LIMITS[planId]
            const isLoading = upgrading === planId
            return (
              <div
                key={planId}
                className={`border rounded-lg p-5 space-y-3 ${planId === 'pro' ? 'border-primary/60' : 'border-border'}`}
              >
                <div>
                  <p className="font-semibold">{meta.name}</p>
                  <p className="text-2xl font-bold">${meta.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>{limits.searchLimit} searches/month</li>
                  <li>{limits.emailLimit} emails/month</li>
                  <li>{limits.mileLimit}-mile radius</li>
                </ul>
                <Button
                  className="w-full"
                  variant={planId === 'pro' ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(planId)}
                  disabled={upgrading !== null}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Upgrade to {meta.name}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Footer links */}
        <div className="px-8 pb-6 flex items-center gap-4 text-sm">
          <button
            onClick={onBypass}
            className="text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View my data (read-only)
          </button>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground underline underline-offset-2">
            Account settings
          </Link>
        </div>
      </div>
    </div>
  )
}
