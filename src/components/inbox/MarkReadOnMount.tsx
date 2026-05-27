'use client'

import { useEffect } from 'react'

export function MarkReadOnMount({ businessId }: { businessId: string }) {
  useEffect(() => {
    fetch(`/api/inbox/${businessId}/read`, { method: 'POST' }).catch(() => {})
  }, [businessId])

  return null
}
