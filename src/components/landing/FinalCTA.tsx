'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/motion/FadeIn'
import { ArrowRight } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

export function FinalCTA() {
  return (
    <section className="py-28 px-6" style={{ background: '#09090b' }}>
      <FadeIn>
        <div
          className="relative max-w-4xl mx-auto rounded-[24px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #162044 50%, #0f172a 100%)',
            border: '1px solid rgba(37,99,235,0.2)',
          }}
        >
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
            aria-hidden
          />

          {/* Glow */}
          <div
            className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(ellipse, #2563eb, transparent 70%)' }}
            aria-hidden
          />

          <div className="relative z-10 flex flex-col items-center text-center px-8 py-20">
            <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-blue-400/70 mb-6">
              Get started today
            </p>
            <h2 className="text-[40px] sm:text-[56px] font-bold tracking-[-0.04em] leading-[1.05] text-white mb-5">
              Your pipeline is
              <br />
              waiting to be built.
            </h2>
            <p className="text-[16px] text-zinc-400 max-w-[400px] leading-[1.65] mb-10">
              Join web developers and agencies who use Prospector to land new clients every week.
              Free to start. No credit card required.
            </p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2.5 bg-white text-zinc-900 font-semibold text-[15px] px-8 py-3.5 rounded-[12px] hover:bg-zinc-100 transition-colors duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)]"
              >
                Start finding leads
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </motion.div>

            <p className="text-[12px] text-zinc-700 mt-6">
              Free to start · No credit card · 5-minute setup
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  )
}
