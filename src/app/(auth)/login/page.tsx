'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MapPin, ArrowRight } from 'lucide-react'

const FIELD =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-4 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/60 focus:ring-0 transition-colors duration-200'

function UnverifiedToast() {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('error') === 'unverified') {
      toast.error('Please verify your email before signing in. Check your inbox.')
    }
  }, [searchParams])
  return null
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Sign in failed.')
        return
      }
      router.push('/dashboard')
      router.refresh()
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
      <Suspense><UnverifiedToast /></Suspense>

      {/* Ambient orb */}
      <div
        className="pointer-events-none fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.1] blur-[100px]"
        style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }}
        aria-hidden
      />

      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 group w-fit mx-auto">
          <div className="bg-blue-600 rounded-[8px] p-[7px] group-hover:bg-blue-500 transition-colors duration-200">
            <MapPin className="h-[14px] w-[14px] text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">Prospector</span>
        </Link>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-[-0.035em] text-white leading-tight">
            Welcome back
          </h1>
          <p className="text-[14px] text-zinc-500 mt-1.5">
            Sign in to your account to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13px] font-medium text-zinc-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className={FIELD}
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[13px] font-medium text-zinc-400">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className={FIELD}
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 bg-white text-zinc-900 font-semibold text-[14px] px-6 py-3 rounded-[10px] hover:bg-zinc-100 transition-colors duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          >
            {loading ? 'Signing in…' : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-[12px] text-zinc-700">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <Link
          href="/signup"
          className="block w-full text-center text-[14px] font-medium text-zinc-400 hover:text-zinc-200 py-3 rounded-[10px] border transition-colors duration-200"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          Create an account
        </Link>

        <p className="text-center text-[12px] text-zinc-700 mt-6">
          By signing in you agree to our{' '}
          <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors" target="_blank">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors" target="_blank">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
