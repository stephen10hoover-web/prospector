'use client'

import { useState } from 'react'
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
import { Search, Loader2 } from 'lucide-react'

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

const STATUS_MESSAGES = [
  'Searching for businesses...',
  'Analyzing websites...',
  'Scoring leads...',
  'Saving results...',
]

export function SearchForm() {
  const router = useRouter()
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [radius, setRadius] = useState('20')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category.trim() || !location.trim()) {
      toast.error('Please fill in category and location')
      return
    }

    setLoading(true)
    setProgress(10)
    setStatusMessage(STATUS_MESSAGES[0])

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval)
          return 85
        }
        const next = prev + 15
        const msgIndex = Math.min(Math.floor(next / 25), STATUS_MESSAGES.length - 1)
        setStatusMessage(STATUS_MESSAGES[msgIndex])
        return next
      })
    }, 1200)

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

      clearInterval(progressInterval)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Search failed')
      }

      const data = await res.json()
      setProgress(100)
      setStatusMessage('Done!')
      toast.success(`Found ${data.businesses?.length ?? 0} businesses!`)

      setTimeout(() => {
        router.push(`/leads?search_id=${data.searchId}`)
      }, 500)
    } catch (error) {
      clearInterval(progressInterval)
      toast.error(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
      setProgress(0)
      setStatusMessage('')
    }
  }

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
              className="text-xs px-2 py-1 rounded-full border bg-muted hover:bg-accent transition-colors"
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
            Searching...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Find Leads
          </>
        )}
      </Button>
    </form>
  )
}
