'use client'

import { useEffect } from 'react'

const RATE_LIMIT_KEY = 'seq_processor_last_run'
const MIN_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function SequenceProcessor({ userId }: { userId: string }) {
  useEffect(() => {
    const lastRun = localStorage.getItem(RATE_LIMIT_KEY)
    const now = Date.now()

    if (lastRun && now - parseInt(lastRun, 10) < MIN_INTERVAL_MS) return

    localStorage.setItem(RATE_LIMIT_KEY, String(now))

    fetch(`/api/cron/sequences?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
    }).catch(() => {
      // Fire and forget
    })
  }, [userId])

  return null
}
