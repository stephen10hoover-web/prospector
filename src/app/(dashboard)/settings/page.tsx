'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2, Zap, CreditCard, BarChart2, CheckCircle, Palette,
  Mail, MapPin, Clock, Star, Users, Shield,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PLAN_META, PLAN_LIMITS, planDisplayName, type PlanId } from '@/lib/plans'
import type { UserProfile } from '@/types'

interface BillingData {
  plan: PlanId
  status: string
  current_period_end: string | null
  stripe_customer_id: string | null
  is_expired: boolean
  trial_days_remaining: number | null
  trial_expires_at: string | null
  usage: {
    searches_count: number
    emails_sent_count: number
  }
  limits: {
    searchLimit: number
    emailLimit: number
    mileLimit: number
    generationLimit: number
    period: 'week' | 'month'
  }
}

const PLAN_ICONS: Record<PlanId, React.ElementType> = {
  free_trial: Clock,
  pro: Zap,
  team: Users,
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<PlanId | null>(null)
  const [portaling, setPortaling] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileAddress, setProfileAddress] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const addressRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      toast.success('Welcome! Your plan has been upgraded.')
    }
    fetchBillingData()
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const json: UserProfile = await res.json()
        setProfile(json)
        setProfileAddress(json.physical_address ?? '')
      }
    } catch {
      // non-fatal
    }
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ physical_address: profileAddress.trim() || null }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Profile saved')
      setProfile((p) => p ? { ...p, physical_address: profileAddress.trim() || null } : p)
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

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

  async function handleUpgrade(planId: 'pro' | 'team') {
    setUpgrading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to start checkout')
      window.location.href = json.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
      setPortaling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your plan, usage, and preferences</p>
      </div>

      {/* Current Plan Status */}
      <Card className={isExpired ? 'border-destructive' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = PLAN_ICONS[currentPlan]
                return <Icon className="h-5 w-5 text-primary" />
              })()}
              <CardTitle>{planDisplayName(currentPlan)} Plan</CardTitle>
            </div>
            <Badge variant={isExpired ? 'destructive' : isPaid ? 'default' : 'secondary'}>
              {isExpired ? 'Expired' : isPaid ? 'Active' : `${data?.trial_days_remaining ?? 0}d left`}
            </Badge>
          </div>
          <CardDescription>
            {isExpired
              ? 'Your free trial has expired. Upgrade to continue using Prospector.'
              : currentPlan === 'free_trial'
              ? `Trial ends in ${data?.trial_days_remaining ?? 0} day${data?.trial_days_remaining === 1 ? '' : 's'} — ${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/week · ${data?.limits.emailLimit} emails/week`
              : `${data?.limits.mileLimit}mi limit · ${data?.limits.searchLimit} searches/mo · ${data?.limits.emailLimit} emails/mo`}
          </CardDescription>
        </CardHeader>
        {isPaid && (
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

      {/* Pricing Plans */}
      {!isPaid && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['pro', 'team'] as const).map((planId) => {
              const meta = PLAN_META[planId]
              const limits = PLAN_LIMITS[planId]
              const isRecommended = meta.recommended
              const features = [
                `${limits.mileLimit} mile search radius`,
                `${limits.searchLimit} searches / month`,
                `${limits.emailLimit} emails / month`,
                `${limits.generationLimit} AI generations / month`,
                planId === 'team' ? 'Priority support' : 'Email discovery',
              ]

              return (
                <Card
                  key={planId}
                  className={isRecommended ? 'border-primary ring-1 ring-primary relative' : 'relative'}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="flex items-center gap-1 px-3">
                        <Star className="h-3 w-3" />
                        Most Popular
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
                      variant={isRecommended ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(planId)}
                      disabled={upgrading !== null}
                    >
                      {upgrading === planId ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting...</>
                      ) : (
                        <>
                          {planId === 'pro' ? <Zap className="h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                          Get {meta.name}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

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
              <span className="font-medium">
                {searchUsage} / {searchLimit}
              </span>
            </div>
            <Progress
              value={Math.min((searchUsage / searchLimit) * 100, 100)}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Emails Sent</span>
              <span className="font-medium">
                {emailUsage} / {emailLimit}
              </span>
            </div>
            <Progress
              value={Math.min((emailUsage / emailLimit) * 100, 100)}
              className="h-2"
            />
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Search radius limit: {data?.limits.mileLimit ?? 20} miles
          </div>
        </CardContent>
      </Card>

      {/* Email Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Identity
          </CardTitle>
          <CardDescription>Your dedicated sending address — all outreach emails come from this address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Your Sending Address</Label>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2 border">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-mono font-medium">
                {profile?.sending_email ?? '—'}
              </span>
              <Badge variant="secondary" className="ml-auto text-xs">Read-only</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              This address is unique to your account and cannot be changed or accessed by other users.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="physical-address" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Business Address
              <span className="text-xs text-muted-foreground font-normal ml-1">(shown in email footer — required by CAN-SPAM)</span>
            </Label>
            <Input
              id="physical-address"
              ref={addressRef}
              placeholder="123 Main St · City, State ZIP"
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              maxLength={500}
            />
            <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Save Address
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  )
}
