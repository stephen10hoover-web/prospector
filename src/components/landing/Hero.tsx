'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Search, ChevronRight } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

const mockLeads = [
  {
    name: 'Apex Plumbing & Drain',
    score: 91,
    reviews: 143,
    site: 'apexplumbing.com',
    tag: 'High value',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    scoreColor: 'text-emerald-400',
    scoreBg: 'rgba(16,185,129,0.1)',
  },
  {
    name: 'City Water Solutions',
    score: 74,
    reviews: 89,
    site: 'citywater.com',
    tag: null,
    tagColor: '',
    scoreColor: 'text-amber-400',
    scoreBg: 'rgba(245,158,11,0.1)',
  },
  {
    name: 'Quick Fix Plumbers',
    score: 58,
    reviews: 34,
    site: 'quickfixplumb.com',
    tag: null,
    tagColor: '',
    scoreColor: 'text-zinc-500',
    scoreBg: 'rgba(113,113,122,0.1)',
  },
]

export function Hero() {
  return (
    <section
      className="relative flex flex-col items-center bg-[#09090b] overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      {/* Background layer */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        {/* Blue orb top-right */}
        <div
          className="absolute top-[-18%] right-[-8%] w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 68%)',
          }}
        />
        {/* Violet orb bottom-left */}
        <div
          className="absolute bottom-[5%] left-[-6%] w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 68%)',
          }}
        />
      </div>

      {/* Text content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6 pt-36 pb-0 max-w-[840px] mx-auto"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={item} className="mb-7">
          <span className="inline-flex items-center gap-2 border border-white/[0.09] bg-white/[0.04] rounded-full px-4 py-1.5 text-[12.5px] text-zinc-400 tracking-[0.01em]">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            </span>
            AI-powered lead generation for web professionals
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-[52px] sm:text-[64px] lg:text-[76px] font-bold tracking-[-0.045em] leading-[1.02] text-white mb-5"
        >
          The AI lead machine
          <br />
          <span className="text-zinc-500">for web professionals.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={item}
          className="text-[17px] sm:text-[19px] text-zinc-500 max-w-[480px] leading-[1.65] mb-9"
        >
          Find local businesses, score them with AI, and send personalized pitches —
          without ever opening a spreadsheet.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 bg-white text-zinc-900 font-medium text-[14px] px-6 py-3 rounded-[10px] hover:bg-zinc-100 transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)]"
          >
            Start for free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
          <Link
            href="/login"
            className="text-[14px] text-zinc-500 hover:text-zinc-300 transition-colors duration-200 px-3 py-3"
          >
            Sign in to your account →
          </Link>
        </motion.div>
      </motion.div>

      {/* Product UI mockup */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.55, ease: EASE }}
        className="relative z-10 w-full max-w-[760px] mx-auto px-6 mt-14 pb-28"
      >
        {/* Glow beneath */}
        <div
          className="absolute left-[10%] right-[10%] top-6 bottom-0 pointer-events-none blur-[60px] opacity-[0.18]"
          style={{ background: 'linear-gradient(180deg, #2563eb 0%, transparent 70%)' }}
          aria-hidden
        />

        {/* App window */}
        <div
          className="relative rounded-[18px] overflow-hidden animate-float"
          style={{
            background: '#0c0c10',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: [
              '0 0 0 1px rgba(255,255,255,0.04)',
              '0 24px 80px rgba(0,0,0,0.7)',
              '0 0 140px rgba(37,99,235,0.05)',
            ].join(', '),
          }}
        >
          {/* Chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}
          >
            <div className="flex gap-[6px]">
              {['rgba(255,95,86,0.6)', 'rgba(255,189,46,0.6)', 'rgba(40,201,64,0.6)'].map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div className="flex-1 mx-4">
              <div
                className="text-[11px] text-zinc-600 text-center font-mono rounded-md px-3 py-[5px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                app.prospector.io/search
              </div>
            </div>
            <div className="w-[52px]" />
          </div>

          {/* Search bar row */}
          <div
            className="flex items-center gap-2.5 px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] text-zinc-300"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Search className="h-[14px] w-[14px] text-zinc-600 shrink-0" />
              <span>Plumbers in Austin, TX</span>
            </div>
            <button
              className="shrink-0 text-[12px] font-semibold text-white px-4 py-2 rounded-[8px] transition-colors"
              style={{ background: '#2563eb' }}
              tabIndex={-1}
            >
              Search
            </button>
          </div>

          {/* Results header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span className="text-[11px] text-zinc-600">47 businesses · Austin, TX</span>
            <span className="text-[11px] text-zinc-700">Sorted by AI score</span>
          </div>

          {/* Lead rows */}
          {mockLeads.map((lead, i) => (
            <div
              key={lead.name}
              className="flex items-center gap-3.5 px-4 py-3.5 transition-colors"
              style={{
                borderBottom: i < mockLeads.length - 1 ? '1px solid rgba(255,255,255,0.035)' : 'none',
                opacity: 1 - i * 0.14,
              }}
            >
              {/* Score */}
              <div
                className="shrink-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[12px] font-bold"
                style={{ background: lead.scoreBg, color: lead.scoreColor.replace('text-', '') }}
              >
                <span className={lead.scoreColor}>{lead.score}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-zinc-200 truncate">{lead.name}</span>
                  {lead.tag && (
                    <span
                      className={`shrink-0 text-[10px] font-medium px-1.5 py-[3px] rounded-[5px] border ${lead.tagColor}`}
                    >
                      {lead.tag}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-600 mt-0.5">
                  {lead.reviews} reviews · {lead.site}
                </div>
              </div>

              <ChevronRight className="h-[15px] w-[15px] text-zinc-700 shrink-0" />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
