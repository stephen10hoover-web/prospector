'use client'

// UpgradePrompt — shown inline whenever a user hits a plan limit.
// Tells them exactly what they'd gain on the next tier and gives a
// one-click path to /pricing or directly to checkout.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, Users, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PLAN_META, PLAN_LIMITS, type PlanId } from '@/lib/plans'

export interface UpgradePromptProps {
  limitType: 'search' | 'email' | 'mile'
  message: string
  currentPlan: PlanId
  onDismiss?: () => void
}

// Returns the next logical plan to recommend based on current plan.
function nextPlan(currentPlan: PlanId): 'pro' | 'team' {
  return currentPlan === 'team' ? 'team' : 'pro'
}

const LIMIT_LABELS: Record<UpgradePromptProps['limitType'], string> = {
  search: 'searches',
  email: 'outreach emails',
  mile: 'search radius',
}

export function UpgradePrompt({ limitType, message, currentPlan, onDismiss }: UpgradePromptProps) {
  const router = useRouter()
  const [upgrading, setUpgrading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const targetPlanId = nextPlan(currentPlan)
  const targetMeta = PLAN_META[targetPlanId]
  const targetLimits = PLAN_LIMITS[targetPlanId]

  const gainText = {
    search: `${targetLimits.searchLimit} searches/${targetLimits.period}`,
    email: `${targetLimits.emailLimit} emails/${targetLimits.period}`,
    mile: `${targetLimits.mileLimit}-mile search radius`,
  }[limitType]

  function handleDismiss() {
    setDismissed(true)
    onDismiss?.()
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlanId }),
      })
      const json = await res.json()
      if (res.status === 503) {
        // Stripe not configured — fall back to pricing page
        router.push('/pricing')
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Checkout failed')
      window.location.href = json.url
    } catch {
      // On any failure, send them to the pricing page rather than showing a dead end
      router.push('/pricing')
    } finally {
      setUpgrading(false)
    }
  }

  if (dismissed) return null

  const PlanIcon = targetPlanId === 'team' ? Users : Zap

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <PlanIcon className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              You&apos;ve hit your {LIMIT_LABELS[limitType]} limit for this{' '}
              {currentPlan === 'free_trial' ? 'week' : 'month'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upgrade to{' '}
              <span className="font-semibold text-foreground">{targetMeta.name}</span> and get{' '}
              {gainText} — {targetMeta.priceLabel}.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleUpgrade} disabled={upgrading}>
                {upgrading
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                }
                Upgrade to {targetMeta.name}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push('/pricing')}>
                See all plans
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
