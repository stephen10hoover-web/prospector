'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

interface AuditButtonProps {
  businessId: string
  existingToken: string | null
}

export function AuditButton({ businessId, existingToken }: AuditButtonProps) {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(existingToken)

  async function handleClick() {
    if (token) {
      window.open(`/audit/${token}`, '_blank')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/audit`, { method: 'POST' })
      const data = await res.json()
      if (data.shareToken) {
        setToken(data.shareToken)
        window.open(`/audit/${data.shareToken}`, '_blank')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {token ? 'View Audit Report' : 'Generate Audit Report'}
    </Button>
  )
}
