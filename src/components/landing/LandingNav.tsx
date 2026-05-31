'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#09090b]/80 backdrop-blur-2xl border-b border-white/[0.05]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-[60px]">

        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-blue-600 rounded-[8px] p-[7px] group-hover:bg-blue-500 transition-colors duration-200 shrink-0">
            <MapPin className="h-[14px] w-[14px] text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            Prospector
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 leading-none"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden sm:block text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center text-[13px] font-medium bg-white text-zinc-900 px-4 py-2 rounded-[8px] hover:bg-zinc-100 transition-colors duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          >
            Get started
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
