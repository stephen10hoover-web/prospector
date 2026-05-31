import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer
      className="px-6 py-10"
      style={{
        background: '#09090b',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">

        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 rounded-[7px] p-[6px] group-hover:bg-blue-500 transition-colors duration-200">
            <MapPin className="h-[12px] w-[12px] text-white" />
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-zinc-400 group-hover:text-zinc-200 transition-colors duration-200">
            Prospector
          </span>
        </Link>

        <div className="flex items-center gap-7">
          {[
            { label: 'Terms', href: '/terms' },
            { label: 'Privacy', href: '/privacy' },
            { label: 'Sign in', href: '/login' },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-[13px] text-zinc-600 hover:text-zinc-300 transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </div>

        <p className="text-[12px] text-zinc-700">
          © {new Date().getFullYear()} Prospector
        </p>
      </div>
    </footer>
  )
}
