import { requireSuperAdmin } from '@/lib/admin'
import { logAuditEvent } from '@/lib/audit'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  LayoutDashboard, Users, Shield, Activity, LogOut,
} from 'lucide-react'

const NAV = [
  { label: 'Overview',  href: '/internal/core/ops/console',       icon: LayoutDashboard },
  { label: 'Users',     href: '/internal/core/ops/console/users', icon: Users },
  { label: 'Audit Log', href: '/internal/core/ops/console/audit', icon: Shield },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Full session + email verification — redirects to /login if not super-admin
  const { session, ip, userAgent } = await requireSuperAdmin('admin_layout')

  const reqHeaders = headers()
  const pathname = reqHeaders.get('x-invoke-path') ?? ''

  await logAuditEvent({
    actorEmail: session.user.email!,
    action: 'admin.session.active',
    ip,
    userAgent,
    severity: 'info',
  })

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-0.5">Internal</p>
          <p className="text-sm font-bold text-white">Admin Console</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-white/30 truncate mb-2">{session.user.email}</p>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur px-8 py-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-400" />
          <span className="text-xs font-medium text-white/60 uppercase tracking-widest">
            Prospector Internal Operations
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/40">Live</span>
          </div>
        </div>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
