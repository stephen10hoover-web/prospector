'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Search, Loader2, Zap } from 'lucide-react'

const CATEGORY_SUGGESTIONS = [
  'Roofers',
  'Landscapers',
  'Med Spas',
  'Salons',
  'Gyms',
  'Restaurants',
  'General Contractors',
  'Plumbers',
  'Electricians',
  'HVAC Companies',
  'Dental Offices',
  'Auto Repair Shops',
  'Cleaning Services',
  'Pest Control',
  'Painting Contractors',
]

const RADIUS_OPTIONS = [
  { value: '5', label: '5 miles' },
  { value: '10', label: '10 miles' },
  { value: '20', label: '20 miles' },
  { value: '50', label: '50 miles' },
]

type SearchPhase = 'idle' | 'submitting' | 'searching' | 'analyzing' | 'scoring' | 'done' | 'failed'

const PHASE_MESSAGES: Record<SearchPhase, string> = {
  idle: '',
  submitting: 'Starting search...',
  searching: 'Searching Google Maps for businesses...',
  analyzing: 'Analyzing websites and scoring leads...',
  scoring: 'Running AI qualification...',
  done: 'Done! Redirecting...',
  failed: 'Search failed. Please try again.',
}

const PHASE_PROGRESS: Record<SearchPhase, number> = {
  idle: 0,
  submitting: 10,
  searching: 30,
  analyzing: 60,
  scoring: 85,
  done: 100,
  failed: 0,
}

export function SearchForm() {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [radius, setRadius] = useState('20')
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const loading = phase !== 'idle' && phase !== 'failed'

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function pollStatus(searchId: string) {
    const elapsed = Date.now() - startTimeRef.current
    // Advance phase based on time elapsed (gives visual feedback while waiting)
    if (elapsed < 5000) {
      setPhase('searching')
    } else if (elapsed < 20000) {
      setPhase('analyzing')
    } else {
      setPhase('scoring')
    }

    try {
      const res = await fetch(`/api/search/${searchId}/status`, { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json()

      if (data.status === 'completed') {
        stopPolling()
        setPhase('done')
        toast.success(`Found ${data.result_count} businesses!`)
        setTimeout(() => router.push(`/leads?search_id=${searchId}`), 500)
      } else if (data.status === 'failed') {
        stopPolling()
        setPhase('failed')
        toast.error('Search failed. Please try again.')
      }
    } catch {
      // Polling errors are non-fatal — keep trying
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category.trim() || !location.trim()) {
      toast.error('Please fill in category and location')
      return
    }

    setPhase('submitting')
    startTimeRef.current = Date.now()

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.trim(),
          location: location.trim(),
          radius: parseInt(radius),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (err.upgrade) {
          toast.error(err.error ?? 'Monthly limit reached. Upgrade to Pro.')
        } else {
          throw new Error(err.error ?? 'Search failed')
        }
        setPhase('idle')
        return
      }

      const { searchId } = await res.json()
      setPhase('searching')

      // Start polling every 2 seconds
      pollRef.current = setInterval(() => pollStatus(searchId), 2000)
      // Also poll immediately
      await pollStatus(searchId)
    } catch (error) {
      stopPolling()
      setPhase('failed')
      toast.error(error instanceof Error ? error.message : 'Search failed')
      setTimeout(() => setPhase('idle'), 2000)
    }
  }

  const progress = PHASE_PROGRESS[phase]
  const statusMessage = PHASE_MESSAGES[phase]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="category">Business Category</Label>
        <Input
          id="category"
          placeholder="e.g. Roofers, Med Spas, Landscapers"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
          list="category-suggestions"
        />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {CATEGORY_SUGGESTIONS.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCategory(s)}
              disabled={loading}
              className="text-xs px-2 py-1 rounded-full border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="e.g. Austin, TX or Miami, Florida"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="radius">Search Radius</Label>
        <Select value={radius} onValueChange={setRadius} disabled={loading}>
          <SelectTrigger id="radius">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {phase === 'submitting' ? 'Starting...' : 'Searching...'}
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Find Leads
          </>
        )}
      </Button>

      {!loading && (
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Zap className="h-3 w-3" />
          Results include AI scoring, website analysis, and email discovery
        </p>
      )}
    </form>
  )
}
