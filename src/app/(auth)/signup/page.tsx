'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createBrowserClient } from '@/lib/supabase'
import { MapPin, ArrowRight, Search, ChevronRight, Mail, BarChart2, CheckCircle } from 'lucide-react'

const FIELD =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-4 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/60 transition-colors duration-200'

const mockLeads = [
  { name: 'Apex Plumbing & Drain', score: 91, reviews: 143, s: 'text-emerald-400', sb: 'rgba(16,185,129,0.1)', tag: 'High value' },
  { name: 'City Water Solutions', score: 74, reviews: 89, s: 'text-amber-400', sb: 'rgba(245,158,11,0.1)', tag: null },
  { name: 'Quick Fix Plumbers', score: 58, reviews: 34, s: 'text-zinc-500', sb: 'rgba(113,113,122,0.08)', tag: null },
]

const perks = [
  { icon: Search, label: 'Find leads in any city' },
  { icon: BarChart2, label: 'AI quality score on every lead' },
  { icon: Mail, label: 'Personalized pitches in one click' },
]

export default function SignupPage() {
  const supabase = createBrowserClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (password.length < 12) { toast.error('Password must be at least 12 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Sign up failed.'); return }
      setDone(true)
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  /* ── Confirmation screen ── */
  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 py-12"
        style={{ background: '#09090b' }}
      >
        {/* Orb */}
        <div className="pointer-events-none fixed top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.1] blur-[100px]" style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }} aria-hidden />

        <div className="relative w-full max-w-[400px]">
          <Link href="/" className="flex items-center gap-2.5 mb-10 group w-fit mx-auto">
            <div className="bg-blue-600 rounded-[8px] p-[7px] group-hover:bg-blue-500 transition-colors duration-200">
              <MapPin className="h-[14px] w-[14px] text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">Prospector</span>
          </Link>

          <div
            className="rounded-[20px] p-8 text-center space-y-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
            </div>

            <div>
              <h1 className="text-[22px] font-bold tracking-[-0.03em] text-white">Check your inbox</h1>
              <p className="text-[14px] text-zinc-500 mt-2 leading-relaxed">
                We sent a confirmation link to{' '}
                <span className="text-zinc-300 font-medium">{email}</span>.
                Click it to activate your account.
              </p>
            </div>

            <div
              className="rounded-[12px] p-4 text-left space-y-1.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[12px] font-medium text-zinc-400">Didn&apos;t receive it?</p>
              <p className="text-[12px] text-zinc-600">
                Check your spam folder, or{' '}
                <button
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  onClick={async () => {
                    await supabase.auth.resend({ type: 'signup', email })
                    toast.success('Confirmation email resent')
                  }}
                >
                  resend the email
                </button>
                .
              </p>
            </div>
          </div>

          <p className="text-center text-[13px] text-zinc-600 mt-6">
            Already confirmed?{' '}
            <Link href="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  /* ── Main signup layout ── */
  return (
    <div className="min-h-screen flex" style={{ background: '#09090b' }}>

      {/* ── Left panel — product preview ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[48%] p-12 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.022] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />
        {/* Orb */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] opacity-[0.12] blur-[80px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #2563eb, transparent 70%)' }}
          aria-hidden
        />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="bg-blue-600 rounded-[8px] p-[7px] group-hover:bg-blue-500 transition-colors duration-200">
              <MapPin className="h-[14px] w-[14px] text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">Prospector</span>
          </Link>
        </div>

        {/* Content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-[32px] font-bold tracking-[-0.04em] leading-[1.1] text-white">
              Stop cold-browsing
              <br />
              <span className="text-zinc-500">Google for clients.</span>
            </h2>
            <p className="text-[14px] text-zinc-600 mt-4 leading-[1.7] max-w-[320px]">
              Search any business niche in any city. Every result is scored by AI and ready for personalized outreach.
            </p>
          </div>

          {/* Mock search */}
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] max-w-[320px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Search className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
            <span className="text-[13px] text-zinc-400 flex-1">Plumbers in Austin, TX</span>
            <div className="text-[11px] font-semibold text-white px-3 py-1 rounded-[7px]" style={{ background: '#2563eb' }}>
              Search
            </div>
          </div>

          {/* Mock leads */}
          <div className="space-y-2 max-w-[320px]">
            {mockLeads.map((lead, i) => (
              <div
                key={lead.name}
                className="flex items-center gap-3 px-3 py-3 rounded-[12px]"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  opacity: 1 - i * 0.14,
                }}
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-[9px] flex items-center justify-center text-[12px] font-bold"
                  style={{ background: lead.sb }}
                >
                  <span className={lead.s}>{lead.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-medium text-zinc-300 truncate">{lead.name}</p>
                    {lead.tag && (
                      <span className="shrink-0 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-[2px] rounded-[4px]">
                        {lead.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{lead.reviews} reviews</p>
                </div>
                <ChevronRight className="h-[13px] w-[13px] text-zinc-700 shrink-0" />
              </div>
            ))}
            <p className="text-[11px] text-zinc-700 text-center pt-1">+ 44 more results</p>
          </div>
        </div>

        {/* Perks */}
        <div className="relative space-y-3">
          {perks.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-[12px] text-zinc-600">
              <Icon className="h-3.5 w-3.5 text-blue-500/70 shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative">

        {/* Orb */}
        <div className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[100px]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} aria-hidden />

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div className="bg-blue-600 rounded-[8px] p-[7px]">
            <MapPin className="h-[14px] w-[14px] text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">Prospector</span>
        </div>

        <div className="relative w-full max-w-[340px]">
          <div className="mb-8">
            <h1 className="text-[28px] font-bold tracking-[-0.035em] text-white leading-tight">
              Create your account
            </h1>
            <p className="text-[14px] text-zinc-500 mt-1.5">Free to start — no credit card required.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-zinc-400">Email address</label>
              <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-zinc-400">Password</label>
              <input id="password" type="password" placeholder="At least 12 characters" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm" className="block text-[13px] font-medium text-zinc-400">Confirm password</label>
              <input id="confirm" type="password" placeholder="••••••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} className={FIELD} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-white text-zinc-900 font-semibold text-[14px] px-6 py-3 rounded-[10px] hover:bg-zinc-100 transition-colors duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            >
              {loading ? 'Creating account…' : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-zinc-700 mt-4 leading-relaxed text-center">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors" target="_blank">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors" target="_blank">Privacy Policy</Link>.
            You must be 18+.
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-[12px] text-zinc-700">already have an account?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <Link
            href="/login"
            className="block w-full text-center text-[14px] font-medium text-zinc-400 hover:text-zinc-200 py-3 rounded-[10px] border transition-colors duration-200"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
