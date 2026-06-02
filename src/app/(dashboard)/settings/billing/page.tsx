'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Loader2, Zap, CreditCard, BarChart2, CheckCircle,
  Clock, Star, Users, Shield,
} from 'lucide-react'
import { PLAN_META, PLAN_LIMITS, planDisplayName, type PlanId } from '@/lib/plans'

interface BillingData {
  plan: PlanId
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  is_expired: boolean
  trial_days_remaining: number | null
  usage: { searches_count: number; emails_sent_count: number }
  limits: { searchLimit: number; emailLimit: number; mileLimit: number; generationLimit: number; period: 'week' | 'month' }
}

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free_trial: Clock,
  pro: Zap,
  team: Users,
}

function UpgradedToast() {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Welcome! Your plan has been upgraded.')
    }
  }, [searchParams])
  return null
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<PlanId | null>(null)
  const [portaling, setPortaling] = useState(false)

  useEffect(() => {
    fetch('/api/billing/status')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => json && setData(json))
      .catch(() => toast.error('Failed to load billing data'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(planId: 'pro' | 'team') {
    setUpgrading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const json = await res.json()
      if (res.status === 503) { toast.error('Online checkout unavailable. Contact us to upgrade.'); return }
      if (!res.ok) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout')
      setUpgrading(null)
    }
  }

  async function handlePortal() {
    setPortaling(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to open portal')
      window.location.href = json.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal')
      setPortaling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentPlan = data?.plan ?? 'free_trial'
  const isPaid = currentPlan === 'pro' || currentPlan === 'team'
  const isExpired = data?.is_expired ?? false
  const periodLabel = data?.limits.period === 'week' ? 'week' : 'month'
  const searchUsage = data?.usage.searches_count ?? 0
  const emailUsage = data?.usage.emails_sent_count ?? 0
  const searchLimit = data?.limits.searchLimit ?? 0
  const emailLimit = data?.limits.emailLimit ?? 0
  const trialDaysRemaining = data?.trial_days_remaining ?? 0
  const trialIsUrgent = currentPlan === 'free_trial' && !isExpired && trialDaysRemaining <= 3
  const cancelAtPeriodEnd = data?.cancel_at_period_end ?? false
  const subscriptionStatus = data?.status ?? 'trialing'
  const PlanIcon = PLAN_ICONS[currentPlan]

  return (
    <div className="space-y-6">
      <Suspense fallback={null}><UpgradedToast /></Suspense>

      {/* Current plan card */}
      <Card className={isExpired ? 'border-destructive' : trialIsUrgent ? 'border-orange-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlanIcon className="h-5 w-5 text-primary" />
              <CardTitle>{planDisplayName(currentPlan)} Plan</CardTitle>
            </div>
            <Badge
              variant={isExpired || subscriptionStatus === 'canceled' || subscriptionStatus === 'past_due' ? 'destructive' : trialIsUrgent ? 'secondary' : isPaid ? 'default' : 'secondary'}
              className={subscriptionStatus === 'past_due' || trialIsUrgent ? 'bg-orange-500 hover:bg-orange-500 text-white border-0' : ''}
            >
              {isExpired ? 'Expired'
                : subscriptionStatus === 'canceled' ? 'Canceled'
                : subscriptionStatus === 'past_due' ? 'Past Due'
                : currentPlan === 'free_trial' ? `${trialDaysRemaining}d left`
                : 'Active'}
            </Badge>
          </div>
          <CardDescription>
            {isExpired
              ? 'Your free trial has expired. Upgrade to continue using Prospector.'
              : currentPlan === 'free_trial'
              ? `Trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} — ${data?.limits.mileLimit}mi · ${data?.limits.searchLimit} searches/week · ${data?.limits.emailLimit} emails/week`
              : `${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/mo · ${data?.limits.emailLimit} emails/mo`}
          </CardDescription>
        </CardHeader>

        {trialIsUrgent && !isExpired && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm text-orange-600 dark:text-orange-400">
              Only {trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} left — upgrade now so you don&apos;t lose access to your leads.
            </div>
          </CardContent>
        )}

        {cancelAtPeriodEnd && data?.current_period_end && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive space-y-2">
              <p className="font-semibold">
                Subscription cancels on {new Date(data.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </p>
              <Button size="sm" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                Reactivate Subscription
              </Button>
            </div>
          </CardContent>
        )}

        {subscriptionStatus === 'past_due' && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 space-y-2">
              <p className="font-semibold">Your last payment failed.</p>
              <Button size="sm" variant="outline" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        )}

        {isPaid && !cancelAtPeriodEnd && subscriptionStatus !== 'past_due' && (
          <CardContent>
            <div className="flex items-center gap-3">
              {data?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(data.current_period_end).toLocaleDateString()}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
                Manage Billing
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Usage This {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}
          </CardTitle>
          <CardDescription>
            Resets {data?.limits.period === 'week' ? 'every Monday' : 'on the 1st of each month'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Searches</span>
              <span className="font-medium">{searchUsage} / {searchLimit}</span>
            </div>
            <Progress value={searchLimit > 0 ? Math.min((searchUsage / searchLimit) * 100, 100) : 0} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Emails Sent</span>
              <span className="font-medium">{emailUsage} / {emailLimit}</span>
            </div>
            <Progress value={emailLimit > 0 ? Math.min((emailUsage / emailLimit) * 100, 100) : 0} className="h-2" />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Search radius limit: {data?.limits.mileLimit ?? 20} miles
          </div>
        </CardContent>
      </Card>

      {/* Upgrade plans */}
      {!isPaid && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['pro', 'team'] as const).map((planId) => {
              const meta = PLAN_META[planId]
              const limits = PLAN_LIMITS[planId]
              const features = [
                `${limits.mileLimit} mile search radius`,
                `${limits.searchLimit} searches / month`,
                `${limits.emailLimit} emails / month`,
                `${limits.generationLimit} AI generations / month`,
                planId === 'team' ? 'Priority support' : 'Email discovery',
              ]
              return (
                <Card key={planId} className={meta.recommended ? 'border-primary ring-1 ring-primary relative' : 'relative'}>
                  {meta.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="flex items-center gap-1 px-3">
                        <Star className="h-3 w-3" />Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{meta.name}</CardTitle>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${meta.price}</p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <CardDescription>{meta.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={meta.recommended ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(planId)}
                      disabled={upgrading !== null}
                    >
                      {upgrading === planId
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting...</>
                        : <>{planId === 'pro' ? <Zap className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}Get {meta.name}</>
                      }
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            <a href="/pricing" className="underline hover:text-foreground">View full pricing comparison</a>
          </p>
        </div>
      )}
    </div>
  )
}
