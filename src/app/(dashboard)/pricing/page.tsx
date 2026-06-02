'use client'

// Pricing page — accessible from the sidebar or any upgrade CTA.
// Shows all 3 plans with the current plan highlighted.
// Upgrade buttons hit POST /api/billing/checkout, with graceful
// fallback if Stripe is not configured (503).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, Loader2, Zap, Clock, Users, Star, ArrowRight, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PLAN_META, PLAN_LIMITS, type PlanId } from '@/lib/plans'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingStatus {
  plan: PlanId
  status: string
  is_expired: boolean
  trial_days_remaining: number | null
}

// ─── Plan feature rows — derived from PLAN_LIMITS, never hardcoded ────────────

function planFeatures(planId: PlanId): string[] {
  const limits = PLAN_LIMITS[planId]
  return [
    `${limits.mileLimit}-mile search radius`,
    planId === 'free_trial'
      ? `${limits.searchLimit} searches / week`
      : `${limits.searchLimit} searches / month`,
    planId === 'free_trial'
      ? `${limits.emailLimit} emails / week`
      : `${limits.emailLimit} emails / month`,
    planId === 'free_trial'
      ? `${limits.generationLimit} AI generations / week`
      : `${limits.generationLimit} AI generations / month`,
    planId === 'team' ? 'Team workspaces' : planId === 'pro' ? 'Email discovery' : 'Basic lead search',
    planId === 'team' ? 'Priority support' : planId === 'pro' ? 'Sequences + A/B testing' : 'AI outreach generation',
  ]
}

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free_trial: Clock,
  pro: Zap,
  team: Users,
}

// ─── CTA label per plan, relative to current plan ────────────────────────────

function ctaLabel(planId: PlanId, currentPlan: PlanId): string {
  if (planId === currentPlan) return 'Your current plan'
  if (planId === 'free_trial') return 'Downgrade'
  if (planId === 'pro') return currentPlan === 'team' ? 'Downgrade to Pro' : 'Upgrade to Pro'
  return 'Upgrade to Team'
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function PricingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-4 w-full bg-muted rounded" />
            ))}
          </div>
          <div className="h-9 w-full bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter()
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [upgrading, setUpgrading] = useState<PlanId | null>(null)
  const [stripeUnavailable, setStripeUnavailable] = useState(false)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/billing/status')
        if (res.ok) {
          const json = await res.json()
          setBillingStatus(json)
        }
      } catch {
        // Non-fatal — page still renders, just without "current plan" highlight
      } finally {
        setLoadingStatus(false)
      }
    }
    fetchStatus()
  }, [])

  async function handleUpgrade(planId: 'pro' | 'team') {
    setUpgrading(planId)
    setStripeUnavailable(false)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      if (res.status === 503) {
        // Stripe not configured in this environment
        setStripeUnavailable(true)
        return
      }

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Checkout failed')
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setUpgrading(null)
    }
  }

  const currentPlan: PlanId = billingStatus?.plan ?? 'free_trial'
  const orderedPlans: PlanId[] = ['free_trial', 'pro', 'team']

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Plans &amp; Pricing</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Find clients. Send outreach. Close deals. Every plan includes AI-powered lead scoring,
          email discovery, and outreach sequences.
        </p>
      </div>

      {/* Stripe unavailable notice */}
      {stripeUnavailable && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Online checkout is not available right now.
            </p>
            <p className="text-muted-foreground mt-0.5">
              Please{' '}
              <a href="mailto:hello@prospector.app" className="underline text-foreground">
                contact us
              </a>{' '}
              to upgrade your plan — we&apos;ll get you set up within one business day.
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      {loadingStatus ? (
        <PricingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {orderedPlans.map((planId) => {
            const meta = PLAN_META[planId]
            const features = planFeatures(planId)
            const isCurrentPlan = planId === currentPlan
            // Pro is the recommended plan per PLAN_META
            const isRecommended = meta.recommended && !isCurrentPlan
            const Icon = PLAN_ICONS[planId]

            return (
              <Card
                key={planId}
                className={[
                  'relative flex flex-col transition-all',
                  isCurrentPlan
                    ? 'border-primary ring-2 ring-primary'
                    : isRecommended
                    ? 'border-primary/60'
                    : '',
                ].join(' ')}
              >
                {/* Badges */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge variant="default" className="px-3 text-xs">
                      Your current plan
                    </Badge>
                  </div>
                )}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="px-3 text-xs flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">{meta.name}</CardTitle>
                  </div>
                  <div className="flex items-end gap-1">
                    {meta.price === null ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">${meta.price}</span>
                        <span className="text-muted-foreground text-sm mb-1">/mo</span>
                      </>
                    )}
                  </div>
                  <CardDescription className="text-xs">{meta.tagline}</CardDescription>
                </CardHeader>

                <Separator />

                <CardContent className="pt-4 flex-1 flex flex-col">
                  <ul className="space-y-2.5 flex-1">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {isCurrentPlan ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : planId === 'free_trial' ? (
                      // Can't "downgrade" to free trial via checkout — send to portal
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push('/settings')}
                      >
                        Manage in Settings
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isRecommended ? 'default' : 'outline'}
                        onClick={() => handleUpgrade(planId as 'pro' | 'team')}
                        disabled={upgrading !== null || stripeUnavailable}
                      >
                        {upgrading === planId ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            {ctaLabel(planId, currentPlan)}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reassurance row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-sm text-muted-foreground pt-2">
        <p>Cancel anytime — no lock-in</p>
        <p>Upgrade or downgrade in seconds</p>
      </div>
    </div>
  )
}
