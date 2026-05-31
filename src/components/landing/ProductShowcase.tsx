'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from '@/components/motion/FadeIn'
import { Search, ChevronRight, Mail, BarChart2 } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const tabs = [
  { id: 'discover', label: 'Discover', icon: Search, description: 'Find leads instantly' },
  { id: 'analyze', label: 'Analyze', icon: BarChart2, description: 'AI quality scoring' },
  { id: 'pitch', label: 'Pitch', icon: Mail, description: 'Personalized outreach' },
] as const

type TabId = (typeof tabs)[number]['id']

/* ─── Tab content components ─────────────────────────────────── */

function DiscoverTab() {
  const leads = [
    { name: 'Apex Plumbing & Drain', score: 91, reviews: 143, site: 'apexplumbing.com', tag: 'High value', s: 'text-emerald-400', sb: 'rgba(16,185,129,0.1)', tc: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
    { name: 'City Water Solutions', score: 74, reviews: 89, site: 'citywater.com', tag: null, s: 'text-amber-400', sb: 'rgba(245,158,11,0.1)', tc: '' },
    { name: 'Sunrise Dental Group', score: 68, reviews: 201, site: 'sunrisedental.com', tag: null, s: 'text-amber-400', sb: 'rgba(245,158,11,0.1)', tc: '' },
    { name: 'Quick Fix Plumbers', score: 42, reviews: 12, site: 'quickfix.com', tag: null, s: 'text-zinc-600', sb: 'rgba(113,113,122,0.08)', tc: '' },
  ]

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] text-zinc-300" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Search className="h-[13px] w-[13px] text-zinc-600 shrink-0" />
          <span>Plumbers in Austin, TX</span>
          <span className="ml-auto h-3.5 w-[1px] bg-blue-400 animate-pulse-dot" />
        </div>
        <div className="shrink-0 text-[12px] font-semibold text-white px-4 py-2 rounded-[8px]" style={{ background: '#2563eb' }}>
          Search
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-[11px] text-zinc-600">47 businesses · Austin, TX</span>
        <span className="text-[11px] text-zinc-700">↓ AI Score</span>
      </div>

      {/* Leads */}
      {leads.map((l, i) => (
        <div key={l.name} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.015]" style={{ borderBottom: i < leads.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: 1 - i * 0.12 }}>
          <div className="shrink-0 w-9 h-9 rounded-[9px] flex items-center justify-center text-[12px] font-bold" style={{ background: l.sb }}>
            <span className={l.s}>{l.score}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-zinc-200 truncate">{l.name}</span>
              {l.tag && <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-[2px] rounded-[4px] ${l.tc}`}>{l.tag}</span>}
            </div>
            <div className="text-[11px] text-zinc-600 mt-0.5">{l.reviews} reviews · {l.site}</div>
          </div>
          <ChevronRight className="h-[14px] w-[14px] text-zinc-700 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function AnalyzeTab() {
  const categories = [
    { label: 'Online presence', score: 95, color: '#10b981' },
    { label: 'Review volume', score: 82, color: '#10b981' },
    { label: 'Website quality', score: 38, color: '#f59e0b', note: '← opportunity' },
    { label: 'Social activity', score: 71, color: '#10b981' },
    { label: 'Response signals', score: 88, color: '#10b981' },
  ]

  return (
    <div>
      {/* Lead header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Apex Plumbing &amp; Drain</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">143 reviews · apexplumbing.com</p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-bold text-emerald-400 leading-none tracking-tight">91</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">AI score / 100</p>
          </div>
        </div>
        {/* Master bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: '91%', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="px-5 py-4 space-y-3.5">
        {categories.map(({ label, score, color, note }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-zinc-400">{label}</span>
              <div className="flex items-center gap-2">
                {note && <span className="text-[10px] text-amber-400/80 italic">{note}</span>}
                <span className="text-[12px] font-medium text-zinc-300">{score}</span>
              </div>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color, opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI summary */}
      <div className="mx-4 mb-4 px-4 py-3 rounded-[10px]" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.15)' }}>
        <p className="text-[11px] text-blue-300 leading-relaxed">
          <span className="font-semibold text-blue-200">AI summary:</span> High-value lead. Strong reputation but website is 6+ years old and not mobile-optimized. Clear need for web services.
        </p>
      </div>
    </div>
  )
}

function PitchTab() {
  const lines = [
    "Hi Mike,",
    "",
    "I came across Apex Plumbing while looking for Austin's",
    "top-rated plumbers — 143 reviews is seriously impressive.",
    "",
    "I put together a quick audit of your site and noticed a few",
    "things that could help convert more of those visitors into",
    "calls. Your site loads slowly on mobile and isn't indexed",
    "properly — both fixable in under a week.",
    "",
    "Worth a quick chat? Happy to share the audit either way.",
  ]

  return (
    <div>
      {/* Email meta */}
      {[
        { l: 'To', v: 'info@apexplumbing.com' },
        { l: 'Subject', v: 'Quick question about your website, Mike' },
      ].map(({ l, v }) => (
        <div key={l} className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[11px] text-zinc-600 shrink-0 pt-px w-12">{l}</span>
          <span className="text-[12px] text-zinc-300 leading-relaxed">{v}</span>
        </div>
      ))}

      {/* Body */}
      <div className="px-4 py-4">
        {lines.map((line, i) => (
          <p key={i} className={`text-[12px] leading-[1.8] ${line === '' ? 'h-3' : 'text-zinc-300'}`}>
            {line}
          </p>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <button className="flex-1 text-[12px] font-semibold text-white py-2 rounded-[8px] transition-colors" style={{ background: '#2563eb' }}>
          Send email
        </button>
        <button className="text-[12px] text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-[8px] transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Edit
        </button>
        <button className="text-[12px] text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-[8px] transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          ↺ Regenerate
        </button>
      </div>
    </div>
  )
}

const tabContent: Record<TabId, React.ReactNode> = {
  discover: <DiscoverTab />,
  analyze: <AnalyzeTab />,
  pitch: <PitchTab />,
}

/* ─── Main component ──────────────────────────────────────────── */

export function ProductShowcase() {
  const [active, setActive] = useState<TabId>('discover')

  const advance = useCallback(() => {
    setActive((prev) => {
      const ids = tabs.map((t) => t.id)
      return ids[(ids.indexOf(prev) + 1) % ids.length]
    })
  }, [])

  useEffect(() => {
    const id = setInterval(advance, 4500)
    return () => clearInterval(id)
  }, [advance])

  return (
    <section className="py-28 px-6" style={{ background: '#09090b' }}>
      <div className="max-w-5xl mx-auto">

        {/* Label + heading */}
        <FadeIn className="text-center mb-16">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-zinc-600 mb-4">
            The workflow
          </p>
          <h2 className="text-[40px] sm:text-[52px] font-bold tracking-[-0.04em] leading-[1.08] text-white">
            From search to signed client,
            <br />
            <span className="text-zinc-500">in one place.</span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Tab selector column */}
            <div className="flex lg:flex-col gap-2 lg:gap-1.5 lg:w-[220px] shrink-0 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {tabs.map(({ id, label, icon: Icon, description }) => {
                const isActive = active === id
                return (
                  <button
                    key={id}
                    onClick={() => setActive(id)}
                    className="shrink-0 flex items-center gap-3 text-left px-4 py-3.5 rounded-[12px] transition-all duration-200 relative"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                      border: isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-[12px]"
                        style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}
                        transition={{ duration: 0.35, ease: EASE }}
                      />
                    )}
                    <div
                      className="relative z-10 shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors duration-200"
                      style={{
                        background: isActive ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
                        border: isActive ? '1px solid rgba(37,99,235,0.25)' : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <Icon className="h-[14px] w-[14px]" style={{ color: isActive ? '#60a5fa' : '#52525b' }} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[13px] font-medium leading-none" style={{ color: isActive ? '#e4e4e7' : '#52525b' }}>
                        {label}
                      </p>
                      <p className="text-[11px] mt-1 leading-none" style={{ color: isActive ? '#71717a' : '#3f3f46' }}>
                        {description}
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* Progress indicator */}
              <div className="hidden lg:flex flex-col gap-1 mt-3 px-4">
                {tabs.map(({ id }) => (
                  <div key={id} className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {active === id && (
                      <motion.div
                        key={`prog-${id}`}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 4.5, ease: 'linear' }}
                        className="h-full rounded-full"
                        style={{ background: '#2563eb' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content window */}
            <div className="flex-1 min-w-0 relative">
              {/* Glow */}
              <div
                className="absolute inset-x-0 top-4 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.3), transparent)' }}
                aria-hidden
              />
              <div
                className="rounded-[18px] overflow-hidden relative"
                style={{
                  background: '#0c0c10',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(37,99,235,0.04)',
                }}
              >
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
                  <div className="flex gap-[6px]">
                    {['rgba(255,95,86,0.5)', 'rgba(255,189,46,0.5)', 'rgba(40,201,64,0.5)'].map((c, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="text-[10px] text-zinc-700 text-center font-mono">
                      {tabs.find((t) => t.id === active)?.label} — Prospector
                    </div>
                  </div>
                  <div className="w-[52px]" />
                </div>

                {/* Animated content */}
                <div className="min-h-[340px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      {tabContent[active]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
