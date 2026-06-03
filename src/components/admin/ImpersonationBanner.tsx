'use client'

import { useState } from 'react'
import { Eye, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImpersonationBannerProps {
  adminEmail: string
  targetEmail: string
}

export function ImpersonationBanner({ adminEmail, targetEmail }: ImpersonationBannerProps) {
  const router = useRouter()
  const [ending, setEnding] = useState(false)

  async function endImpersonation() {
    setEnding(true)
    try {
      await fetch('/api/impersonate', { method: 'DELETE' })
      router.push('/internal/core/ops/console')
    } finally {
      setEnding(false)
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <Eye className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium flex-1">
          <span className="font-bold">{adminEmail}</span>
          {' '}is viewing as{' '}
          <span className="font-bold">{targetEmail}</span>
          {' '}— data displayed is still your own admin account
        </p>
        <button
          onClick={endImpersonation}
          disabled={ending}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/20 hover:bg-amber-950/30 text-amber-950 text-sm font-medium transition-colors"
        >
          {ending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          End Session
        </button>
      </div>
    </div>
  )
}
