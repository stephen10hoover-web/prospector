'use client'

import { FadeInGroup, FadeInItem } from '@/components/motion/FadeIn'

const stats = [
  { value: '10,000+', label: 'Leads discovered' },
  { value: '94%', label: 'Email deliverability' },
  { value: '< 3 min', label: 'Search to first send' },
  { value: '4.9 / 5', label: 'Developer rating' },
]

export function TrustBar() {
  return (
    <section
      className="border-y"
      style={{
        background: 'rgba(255,255,255,0.015)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-16">
        <FadeInGroup className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map(({ value, label }) => (
            <FadeInItem key={label} className="flex flex-col items-center text-center gap-1.5">
              <span className="text-[32px] sm:text-[36px] font-bold text-white tracking-[-0.04em] leading-none">
                {value}
              </span>
              <span className="text-[13px] text-zinc-600">{label}</span>
            </FadeInItem>
          ))}
        </FadeInGroup>
      </div>
    </section>
  )
}
