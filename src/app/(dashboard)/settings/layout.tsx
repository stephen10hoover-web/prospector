'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  User, CreditCard, Palette, Webhook, Ban, Users,
  Bell, Shield, LayoutList,
} from 'lucide-react'

const settingsNav = [
  { href: '/settings', label: 'Profile', icon: User, exact: true },
  { href: '/settings/billing', label: 'Billing & Usage', icon: CreditCard },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/team', label: 'Team & Workspaces', icon: Users },
  { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/settings/suppressions', label: 'Suppressions', icon: Ban },
  { href: '/settings/appearance', label: 'Appearance', icon: Palette },
  { href: '/settings/account', label: 'Account', icon: Shield },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LayoutList className="h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account, billing, and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-48 shrink-0 space-y-0.5">
          {settingsNav.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Page content */}
        <div className="flex-1 min-w-0 space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
