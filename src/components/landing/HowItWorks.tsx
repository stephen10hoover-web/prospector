'use client'

import { FadeIn, FadeInGroup, FadeInItem } from '@/components/motion/FadeIn'

const steps = [
  {
    n: '01',
    title: 'Search any niche, any city',
    body: 'Enter a business category — "dentists", "gyms", "law firms" — and a location. Prospector does the rest in seconds.',
  },
  {
    n: '02',
    title: 'Review AI-scored leads',
    body: 'Browse results sorted by quality score. Filter by score, review count, or website health to find your ideal clients immediately.',
  },
  {
    n: '03',
    title: 'Send personalized outreach',
    body: 'Generate a tailored pitch in one click and send it directly from Prospector. Open tracking is built in.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-28 px-6 relative"
      style={{ background: 'linear-gradient(180deg, #09090b 0%, #0a0c11 100%)' }}
    >
      {/* Subtle divider line top */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} aria-hidden />

      <div className="max-w-5xl mx-auto">
        <FadeIn className="text-center mb-20">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-zinc-600 mb-4">
            Simple process
          </p>
          <h2 className="text-[40px] sm:text-[52px] font-bold tracking-[-0.04em] leading-[1.08] text-white">
            Three steps to
            <br />
            <span className="text-zinc-500">your next client.</span>
          </h2>
        </FadeIn>

        <FadeInGroup className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map(({ n, title, body }) => (
            <FadeInItem key={n}>
              <div
                className="group relative rounded-[18px] p-7 h-full transition-all duration-300 hover:border-white/[0.12]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Number */}
                <span
                  className="block text-[56px] font-bold leading-none tracking-[-0.05em] mb-6 select-none"
                  style={{ color: 'rgba(255,255,255,0.06)' }}
                >
                  {n}
                </span>

                <h3 className="text-[17px] font-semibold text-zinc-100 leading-snug mb-3 tracking-[-0.02em]">
                  {title}
                </h3>
                <p className="text-[14px] text-zinc-600 leading-[1.7]">{body}</p>

                {/* Hover accent line */}
                <div
                  className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.4), transparent)' }}
                  aria-hidden
                />
              </div>
            </FadeInItem>
          ))}
        </FadeInGroup>
      </div>

      {/* Subtle divider line bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} aria-hidden />
    </section>
  )
}
