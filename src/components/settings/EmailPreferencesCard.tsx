'use client'

// Email preferences card for the Settings page.
// Self-contained — fetches and saves its own data.
// Renders four toggle rows for notification categories.

import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import toast from 'react-hot-toast'

interface NotificationPrefs {
  trial_reminders: boolean
  usage_warnings: boolean
  subscription_events: boolean
  win_back: boolean
}

const PREF_ROWS: {
  key: keyof NotificationPrefs
  label: string
  description: string
}[] = [
  {
    key: 'trial_reminders',
    label: 'Trial reminders',
    description: 'Remind me when my trial is expiring',
  },
  {
    key: 'usage_warnings',
    label: 'Usage warnings',
    description: 'Notify me at 75% and 90% of plan limits',
  },
  {
    key: 'subscription_events',
    label: 'Upgrade confirmations',
    description: 'Confirm plan upgrades and downgrades',
  },
  {
    key: 'win_back',
    label: 'Re-engagement emails',
    description: 'Occasional emails if I\'ve been inactive',
  },
]

const DEFAULT_PREFS: NotificationPrefs = {
  trial_reminders: true,
  usage_warnings: true,
  subscription_events: true,
  win_back: false,
}

export function EmailPreferencesCard() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Partial<Record<keyof NotificationPrefs, boolean>>>({})
  const [savingAll, setSavingAll] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setPrefs(data))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function updatePref(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch {
      // Revert optimistic update
      setPrefs((prev) => ({ ...prev, [key]: !value }))
      toast.error('Failed to save preference')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  async function turnOffAll() {
    setSavingAll(true)
    const allOff = { trial_reminders: false, usage_warnings: false, subscription_events: false, win_back: false }
    setPrefs(allOff)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allOff),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('All email notifications turned off')
    } catch {
      setPrefs(prefs) // revert
      toast.error('Failed to save')
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which emails Prospector sends you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {PREF_ROWS.map((row) => (
              <div key={row.key} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <>
            {PREF_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`pref-${row.key}`} className="text-sm font-medium cursor-pointer">
                    {row.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saving[row.key] && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  <Switch
                    id={`pref-${row.key}`}
                    checked={prefs[row.key]}
                    onCheckedChange={(checked) => updatePref(row.key, checked)}
                    disabled={!!saving[row.key]}
                  />
                </div>
              </div>
            ))}

            <Separator />

            {/* Always-sent row — no toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Billing &amp; payment</p>
                <p className="text-xs text-muted-foreground mt-0.5">Payment failures and critical billing events</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">Always sent</Badge>
            </div>

            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={turnOffAll}
                disabled={savingAll}
                className="text-muted-foreground"
              >
                {savingAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Turn off all email notifications
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
