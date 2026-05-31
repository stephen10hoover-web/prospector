'use client'

import { FadeInGroup, FadeInItem } from '@/components/motion/FadeIn'
import { FadeIn } from '@/components/motion/FadeIn'

const testimonials = [
  {
    quote: "I closed 3 discovery calls in my first week. The AI scoring is the real differentiator — I stopped wasting time on bad leads the moment I started using it.",
    name: 'Alex R.',
    role: 'Freelance Web Developer',
    initial: 'A',
    gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  },
  {
    quote: "We replaced a $400/month lead list service with Prospector. Better data, better targeting, and we finally own our own pipeline.",
    name: 'Sarah M.',
    role: 'Digital Agency Owner',
    initial: 'S',
    gradient: 'linear-gradient(135deg, #7c3aed, #db2777)',
  },
  {
    quote: "The website audit feature gets a reply almost every time. Showing a prospect problems they didn't know they had is the best cold outreach opener I've ever used.",
    name: 'James T.',
    role: 'Digital Marketing Consultant',
    initial: 'J',
    gradient: 'linear-gradient(135deg, #0891b2, #10b981)',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-28 px-6" style={{ background: '#09090b' }}>
      <div className="max-w-5xl mx-auto">

        <FadeIn className="text-center mb-16">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-zinc-600 mb-4">
            Real results
          </p>
          <h2 className="text-[40px] sm:text-[52px] font-bold tracking-[-0.04em] leading-[1.08] text-white">
            Developers are winning
            <br />
            <span className="text-zinc-500">clients with Prospector.</span>
          </h2>
        </FadeIn>

        <FadeInGroup className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map(({ quote, name, role, initial, gradient }) => (
            <FadeInItem key={name}>
              <div
                className="relative rounded-[18px] p-6 h-full flex flex-col justify-between gap-6"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Quote mark */}
                <span
                  className="absolute top-4 right-5 text-[64px] leading-none font-serif select-none pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.04)' }}
                  aria-hidden
                >
                  &ldquo;
                </span>

                <p className="text-[14px] text-zinc-400 leading-[1.75] relative z-10">
                  &ldquo;{quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                    style={{ background: gradient }}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-zinc-200">{name}</p>
                    <p className="text-[11px] text-zinc-600">{role}</p>
                  </div>
                </div>
              </div>
            </FadeInItem>
          ))}
        </FadeInGroup>
      </div>
    </section>
  )
}
