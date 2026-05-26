'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import toast from 'react-hot-toast'
import {
  LayoutDashboard,
  Search,
  Users,
  MapPin,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'

interface SidebarProps {
  userEmail: string
  userId: string
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Search Leads',
    href: '/search',
    icon: Search,
  },
  {
    label: 'All Leads',
    href: '/leads',
    icon: Users,
  },
]

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

export function Sidebar({ userEmail, userId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <div className="bg-primary rounded-lg p-1.5">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          Prospector
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isActive && (
                <ChevronRight className="h-3 w-3 ml-auto" />
              )}
            </Link>
          )
        })}
      </nav>

      <Separator />

      <div className="px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-muted/50">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {getInitials(userEmail)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{userEmail}</p>
            <p className="text-xs text-muted-foreground">Free plan</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-background border rounded-lg p-2 shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-card border-r shadow-xl transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
