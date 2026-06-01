'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  filters?: {
    search_id?: string
    category?: string
    city?: string
    status?: string
    minScore?: string
    maxScore?: string
    stage?: string
  }
  totalLeads?: number
}

export function ExportButton({ filters, totalLeads }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters?.search_id) params.set('search_id', filters.search_id)
      if (filters?.category) params.set('category', filters.category)
      if (filters?.city) params.set('city', filters.city)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.minScore) params.set('minScore', filters.minScore)
      if (filters?.maxScore) params.set('maxScore', filters.maxScore)
      if (filters?.stage) params.set('stage', filters.stage)

      const res = await fetch(`/api/leads/export?${params.toString()}`)

      if (res.status === 204) {
        toast.error('No leads to export with current filters')
        return
      }

      if (!res.ok) {
        throw new Error('Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? 'prospector-leads.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Exported${totalLeads ? ` ${totalLeads} leads` : ''} to CSV`)
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5 mr-1.5" />
      )}
      Export CSV
    </Button>
  )
}
