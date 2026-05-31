'use client'

import { motion } from 'framer-motion'
import { FadeIn } from '@/components/motion/FadeIn'
import { Search, Brain, Mail } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const features = [
  {
    eyebrow: '01 — Discover',
    title: 'Find 50 leads in\nunder a minute.',
    body: 'Enter any business category and any city. Prospector surfaces real, verified local businesses — no data imports, no scraping scripts, no spreadsheets. Just results.',
    icon: Search,
    reversed: false,
    visual: <DiscoverVisual />,
  },
  {
    eyebrow: '02 — Analyze',
    title: 'Stop guessing who\nto contact first.',
    body: "Every lead gets an AI quality score based on their website health, review volume, online presence, and growth signals. Filter the noise before you ever open your inbox.",
    icon: Brain,
    reversed: true,
    visual: <AnalyzeVisual />,
  },
  {
    eyebrow: '03 — Outreach',
    title: 'Pitches that feel\nhandwritten.',
    body: "Generate a tailored cold email using each business's real data — their name, reviews, website problems, category. Not a template. A real pitch that gets replies.",
    icon: Mail,
    reversed: false,
    visual: <OutreachVisual />,
  },
]

function DiscoverVisual() {
  const items = [
    { n: 'Apex Plumbing & Drain', s: 91, c: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { n: 'City Water Solutions', s: 74, c: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { n: 'Metro Pipe Works', s: 61, c: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ]
  return (
    <div className="space-y-2">
      {/* search bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-[9px] text-[12px] text-zinc-400" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Search className="h-3 w-3 text-zinc-600 shrink-0" />
        <span>Plumbers in Austin, TX</span>
        <div className="ml-auto h-3.5 w-px bg-blue-400 opacity-80" />
      </div>
      <div className="text-[10px] text-zinc-700 px-1">47 results</div>
      {items.map((it, i) => (
        <div key={it.n} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px]" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)', opacity: 1 - i * 0.15 }}>
          <div className="shrink-0 w-8 h-8 rounded-[7px] flex items-center justify-center text-[11px] font-bold" style={{ background: it.bg, color: it.c }}>{it.s}</div>
          <div>
            <p className="text-[12px] font-medium text-zinc-200">{it.n}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">plumbing · Austin, TX</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyzeVisual() {
  const bars = [
    { l: 'Online presence', v: 95, c: '#10b981' },
    { l: 'Review volume', v: 82, c: '#10b981' },
    { l: 'Website quality', v: 34, c: '#f59e0b', note: 'opportunity' },
    { l: 'Response rate', v: 88, c: '#10b981' },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[12px] font-semibold text-zinc-200">Apex Plumbing &amp; Drain</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">AI analysis complete</p>
        </div>
        <div className="text-right">
          <p className="text-[30px] font-bold text-emerald-400 leading-none tracking-tight">91</p>
          <p className="text-[9px] text-zinc-700">/ 100</p>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: '91%', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
      </div>
      <div className="space-y-2.5 pt-1">
        {bars.map(({ l, v, c, note }) => (
          <div key={l}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-500">{l}</span>
              <div className="flex items-center gap-2">
                {note && <span className="text-[9px] text-amber-400/80 italic">{note}</span>}
                <span className="text-[11px] text-zinc-400">{v}</span>
              </div>
            </div>
            <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full" style={{ width: `${v}%`, background: c, opacity: 0.75 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OutreachVisual() {
  return (
    <div className="space-y-3">
      {[
        { l: 'To', v: 'mike@apexplumbing.com' },
        { l: 'Subject', v: 'Quick question about your website' },
      ].map(({ l, v }) => (
        <div key={l} className="flex gap-3">
          <span className="text-[10px] text-zinc-700 w-10 shrink-0 pt-0.5">{l}</span>
          <span className="text-[11px] text-zinc-300">{v}</span>
        </div>
      ))}
      <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="space-y-1.5 text-[11px] text-zinc-400 leading-[1.75]">
        <p>Hi Mike,</p>
        <p>I noticed Apex Plumbing has 143 five-star reviews — clearly you&apos;re doing something right.</p>
        <p>I ran a quick audit on your site and a few things jumped out that could help convert more visitors into calls...</p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 text-[11px] font-semibold text-white text-center py-2 rounded-[7px]" style={{ background: '#2563eb' }}>Send email</div>
        <div className="text-[11px] text-zinc-500 px-3 py-2 rounded-[7px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>Edit</div>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="py-28" style={{ background: '#09090b' }}>
      <div className="max-w-6xl mx-auto px-6">

        <FadeIn className="text-center mb-24">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-zinc-600 mb-4">
            Built for results
          </p>
          <h2 className="text-[40px] sm:text-[52px] font-bold tracking-[-0.04em] leading-[1.08] text-white">
            Every feature earns
            <br />
            <span className="text-zinc-500">its place.</span>
          </h2>
        </FadeIn>

        <div className="space-y-28">
          {features.map(({ eyebrow, title, body, reversed, visual }) => (
            <FadeIn key={eyebrow}>
              <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-zinc-600 mb-5">{eyebrow}</p>
                  <h3 className="text-[32px] sm:text-[38px] font-bold tracking-[-0.035em] leading-[1.1] text-white mb-5 whitespace-pre-line">
                    {title}
                  </h3>
                  <p className="text-[16px] text-zinc-500 leading-[1.7] max-w-[420px]">{body}</p>
                </div>

                {/* Visual card */}
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.3, ease: EASE } }}
                  className="flex-1 min-w-0 w-full"
                >
                  <div
                    className="rounded-[18px] p-5"
                    style={{
                      background: '#0c0c10',
                      border: '1px solid rgba(255,255,255,0.07)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                    }}
                  >
                    {visual}
                  </div>
                </motion.div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
