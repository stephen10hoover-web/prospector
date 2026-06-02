'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MapPin, ArrowRight, CheckCircle } from 'lucide-react'

const FIELD =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-4 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/60 focus:ring-0 transition-colors duration-200'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong.')
        return
      }
      setSent(true)
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

        {sent ? (
          <div
            className="rounded-[20px] p-8 text-center space-y-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}
              >
                <CheckCircle className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-[-0.03em] text-white">Check your inbox</h1>
              <p className="text-[14px] text-zinc-500 mt-2 leading-relaxed">
                If an account exists for{' '}
                <span className="text-zinc-300 font-medium">{email}</span>,
                we&apos;ve sent a password reset link.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full text-center text-[14px] font-medium text-zinc-400 hover:text-zinc-200 py-3 rounded-[10px] border transition-colors duration-200"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-bold tracking-[-0.035em] text-white leading-tight">
                Reset your password
              </h1>
              <p className="text-[14px] text-zinc-500 mt-1.5">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
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

              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center justify-center gap-2 bg-white text-zinc-900 font-semibold text-[14px] px-6 py-3 rounded-[10px] hover:bg-zinc-100 transition-colors duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
              >
                {loading ? 'Sending…' : (
                  <>
                    Send reset link
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[13px] text-zinc-600 mt-6">
              Remember your password?{' '}
              <Link href="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
