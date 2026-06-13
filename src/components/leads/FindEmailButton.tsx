'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Mail } from 'lucide-react'
import { useRotatingText } from '@/hooks/useRotatingText'
import toast from 'react-hot-toast'

interface FindEmailButtonProps {
  businessId: string
  hasWebsite: boolean
  existingEmail: string | null
}

export function FindEmailButton({ businessId, hasWebsite, existingEmail }: FindEmailButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const searchText = useRotatingText(
    [
      'Searching for email...',
      'Checking Hunter.io...',
      'Scanning the domain...',
      'Looking up contacts...',
      'Almost there...',
    ],
    loading
  )

  async function handleFind() {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/find-email`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not find an email for this business.')
        return
      }
      if (data.source === 'pattern') {
        toast.success(`Best guess: ${data.email} — verify before sending`)
      } else {
        toast.success(`Found: ${data.email} (${data.confidence}% confidence)`)
      }
      router.refresh()
    } catch {
      toast.error('Email lookup failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!hasWebsite) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No website on file — email lookup unavailable.
      </p>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFind}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {searchText}
        </>
      ) : existingEmail ? (
        <>
          <Search className="h-3.5 w-3.5" />
          Re-search Email
        </>
      ) : (
        <>
          <Mail className="h-3.5 w-3.5" />
          Find Email
        </>
      )}
    </Button>
  )
}
