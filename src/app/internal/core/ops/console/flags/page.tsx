'use client'

import { useEffect, useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'

interface FeatureFlag {
  id: string
  key: string
  enabled: boolean
  description: string | null
  updated_at: string
}

const KILL_SWITCH_DESC: Record<string, string> = {
  ai_outreach_generation: 'Disabling this blocks all Claude AI calls for outreach/qualification',
  email_sending:          'Disabling this prevents Resend from delivering any outbound emails',
  serp_api_search:        'Disabling this stops all SerpAPI Google Maps discovery searches',
  stripe_billing:         'Disabling this prevents Stripe webhooks + checkout from processing',
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/internal/flags')
      .then((r) => r.ok ? r.json() : { flags: [] })
      .then((d) => setFlags(d.flags ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleFlag(key: string, current: boolean) {
    const newVal = !current
    // Warn before disabling a kill switch
    if (!newVal && !confirm(`Disable "${key}"? This will immediately take effect for all users.`)) return

    setUpdating(key)
    try {
      const res = await fetch('/api/internal/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: newVal }),
      })
      if (!res.ok) throw new Error('Failed')
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: newVal } : f))
    } catch {
      alert('Failed to update flag')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Kill switches and feature toggles. Changes take effect within 30 seconds for all instances.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
          {flags.length === 0 && (
            <p className="px-5 py-10 text-sm text-white/30 text-center">No flags configured</p>
          )}
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-white/40 shrink-0" />
                  <span className="text-sm font-mono text-white/80">{flag.key}</span>
                  {!flag.enabled && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">disabled</span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5 ml-5">
                  {KILL_SWITCH_DESC[flag.key] ?? flag.description ?? 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-white/20">
                  {new Date(flag.updated_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => toggleFlag(flag.key, flag.enabled)}
                  disabled={updating === flag.key}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                    flag.enabled ? 'bg-green-500' : 'bg-white/10'
                  } ${updating === flag.key ? 'opacity-50' : ''}`}
                  role="switch"
                  aria-checked={flag.enabled}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      flag.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
