'use client'

import { useEffect } from 'react'

// Fires a POST to record that this proposal was viewed.
// Client component so it runs after hydration without dangerouslySetInnerHTML.
export function TrackProposalView({ token }: { token: string }) {
  useEffect(() => {
    fetch(`/api/proposals/${token}/view`, { method: 'POST' }).catch(() => null)
  }, [token])

  return null
}
