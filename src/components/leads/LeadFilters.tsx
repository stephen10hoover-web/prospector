'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
import { SlidersHorizontal, RotateCcw } from 'lucide-react'

interface LeadFiltersProps {
  initialFilters: {
    category?: string
    city?: string
    status?: string
    minScore?: string
    maxScore?: string
  }
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'generated', label: 'Generated' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'interested', label: 'Interested' },
  { value: 'closed', label: 'Closed' },
  { value: 'not_interested', label: 'Not Interested' },
]

export function LeadFilters({ initialFilters }: LeadFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [category, setCategory] = useState(initialFilters.category ?? '')
  const [city, setCity] = useState(initialFilters.city ?? '')
  const [status, setStatus] = useState(initialFilters.status ?? 'all')
  const [minScore, setMinScore] = useState(initialFilters.minScore ?? '')
  const [maxScore, setMaxScore] = useState(initialFilters.maxScore ?? '')
  const [expanded, setExpanded] = useState(false)

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString())

    if (category) params.set('category', category)
    else params.delete('category')

    if (city) params.set('city', city)
    else params.delete('city')

    if (status && status !== 'all') params.set('status', status)
    else params.delete('status')

    if (minScore) params.set('minScore', minScore)
    else params.delete('minScore')

    if (maxScore) params.set('maxScore', maxScore)
    else params.delete('maxScore')

    router.push(`${pathname}?${params.toString()}`)
  }

  function resetFilters() {
    setCategory('')
    setCity('')
    setStatus('all')
    setMinScore('')
    setMaxScore('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('category')
    params.delete('city')
    params.delete('status')
    params.delete('minScore')
    params.delete('maxScore')
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasActiveFilters =
    category || city || (status && status !== 'all') || minScore || maxScore

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
              Active
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Input
              placeholder="e.g. Roofers"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input
              placeholder="e.g. Austin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Min Score</Label>
            <Input
              type="number"
              placeholder="0"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Max Score</Label>
            <Input
              type="number"
              placeholder="100"
              min={0}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex gap-2">
          <Button size="sm" onClick={applyFilters}>
            Apply Filters
          </Button>
          <Button size="sm" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      )}
    </div>
  )
}
