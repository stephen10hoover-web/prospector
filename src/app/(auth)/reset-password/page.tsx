'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MapPin, ArrowRight } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'

const FIELD =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-4 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/60 focus:ring-0 transition-colors duration-200'

// Supabase redirects to /reset-password#access_token=...&refresh_token=...
// We exchange those tokens so supabase.auth.updateUser works in this tab.
function TokenExchanger() {
  const searchParams = useSearchParams()
  useEffect(() => {
    // The tokens are in the URL hash — handled client-side by the Supabase SDK
    // when we call getSession(). No explicit exchange needed; onAuthStateChange
    // fires automatically when the SDK detects the hash fragment.
  }, [searchParams])
  return null
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event that Supabase fires after
    // the user arrives via the reset link (it contains their tokens in the hash).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to reset password.')
        return
      }
      toast.success('Password updated! Redirecting…')
      router.push('/dashboard')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: '#09090b' }}
    >
      <Suspense><TokenExchanger /></Suspense>

      <div
        className="pointer-events-none fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.1] blur-[100px]"
        style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }}
        aria-hidden
      />

      <div className="w-full max-w-[360px]">
        <Link href="/" className="flex items-center gap-2.5 mb-10 group w-fit mx-auto">
          <div className="bg-blue-600 rounded-[8px] p-[7px] group-hover:bg-blue-500 transition-colors duration-200">
            <MapPin className="h-[14px] w-[14px] text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">Prospector</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-[-0.035em] text-white leading-tight">
            Set new password
          </h1>
          <p className="text-[14px] text-zinc-500 mt-1.5">
            Must be at least 12 characters with at least one letter and one number.
          </p>
        </div>

        {!sessionReady && (
          <div
            className="rounded-[12px] px-4 py-3 mb-6 text-[13px] text-amber-400"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            Waiting for reset link to be verified…
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[13px] font-medium text-zinc-400">
              New password
            </label>
            <input
              id="password"
              type="password"
              placeholder="At least 12 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || !sessionReady}
              className={FIELD}
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="block text-[13px] font-medium text-zinc-400">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              placeholder="••••••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading || !sessionReady}
              className={FIELD}
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !sessionReady}
            className="group w-full flex items-center justify-center gap-2 bg-white text-zinc-900 font-semibold text-[14px] px-6 py-3 rounded-[10px] hover:bg-zinc-100 transition-colors duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          >
            {loading ? 'Updating password…' : (
              <>
                Update password
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
