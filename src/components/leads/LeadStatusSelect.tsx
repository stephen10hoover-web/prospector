'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { OutreachStatus } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LeadStatusSelectProps {
  businessId: string
  currentStatus: OutreachStatus
}

export function LeadStatusSelect({ businessId, currentStatus }: LeadStatusSelectProps) {
  const [status, setStatus] = useState<OutreachStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function handleChange(newStatus: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setStatus(newStatus as OutreachStatus)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="not_contacted">Not Contacted</SelectItem>
        <SelectItem value="generated">Generated</SelectItem>
        <SelectItem value="sent">Sent</SelectItem>
        <SelectItem value="replied">Replied</SelectItem>
        <SelectItem value="interested">Interested</SelectItem>
        <SelectItem value="closed">Closed</SelectItem>
        <SelectItem value="not_interested">Not Interested</SelectItem>
      </SelectContent>
    </Select>
  )
}
