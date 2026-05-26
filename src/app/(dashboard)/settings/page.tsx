'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Loader2, Zap, CreditCard, BarChart2, CheckCircle } from 'lucide-react'
import { FREE_LIMITS } from '@/lib/stripe'

interface BillingData {
  plan: 'free' | 'pro'
  status: string
  current_period_end: string | null
  stripe_customer_id: string | null
  usage: {
    searches_count: number
    emails_sent_count: number
  }
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [portaling, setPortaling] = useState(false)

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Welcome to Pro! Your account has been upgraded.')
    }
    fetchBillingData()
  }, [])

  async function fetchBillingData() {
    try {
      const res = await fetch('/api/billing/status')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
      setUpgrading(false)
    }
  }

  async function handlePortal() {
    setPortaling(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to open portal')
      window.location.href = json.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
      setPortaling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPro = data?.plan === 'pro'
  const searchUsage = data?.usage.searches_count ?? 0
  const emailUsage = data?.usage.emails_sent_count ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and usage</p>
      </div>

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isPro ? <Zap className="h-5 w-5 text-yellow-500" /> : <CreditCard className="h-5 w-5" />}
                {isPro ? 'Pro Plan' : 'Free Plan'}
              </CardTitle>
              <CardDescription>
                {isPro
                  ? 'Unlimited searches, unlimited outreach emails'
                  : `${FREE_LIMITS.searches} searches/month · ${FREE_LIMITS.emails} emails/month`}
              </CardDescription>
            </div>
            <Badge variant={isPro ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {isPro ? 'Pro' : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Unlimited lead searches
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Unlimited AI outreach emails
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Email discovery with Hunter.io
              </div>
              {data?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(data.current_period_end).toLocaleDateString()}
                </p>
              )}
              <Separator />
              <Button variant="outline" onClick={handlePortal} disabled={portaling}>
                {portaling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Manage Billing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Upgrade to Pro — $29/month</p>
                <ul className="space-y-1">
                  {[
                    'Unlimited searches',
                    'Unlimited AI outreach emails',
                    'Email discovery via Hunter.io',
                    'Priority support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={handleUpgrade} disabled={upgrading} className="w-full">
                {upgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting to checkout...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            This Month&apos;s Usage
          </CardTitle>
          <CardDescription>
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Searches</span>
              <span className="font-medium">
                {searchUsage}
                {!isPro && ` / ${FREE_LIMITS.searches}`}
              </span>
            </div>
            {!isPro && (
              <Progress value={(searchUsage / FREE_LIMITS.searches) * 100} className="h-2" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Emails Sent</span>
              <span className="font-medium">
                {emailUsage}
                {!isPro && ` / ${FREE_LIMITS.emails}`}
              </span>
            </div>
            {!isPro && (
              <Progress value={(emailUsage / FREE_LIMITS.emails) * 100} className="h-2" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
