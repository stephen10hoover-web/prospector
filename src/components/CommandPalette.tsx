'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Search, Users, Kanban, Zap, Inbox,
  BarChart3, Settings, CreditCard, HelpCircle, Plus, Activity,
} from 'lucide-react'

interface Command {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
  group: string
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const commands: Command[] = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, group: 'Navigate', action: () => router.push('/dashboard') },
    { id: 'search', label: 'Search Leads', icon: Search, group: 'Navigate', action: () => router.push('/search') },
    { id: 'leads', label: 'View All Leads', icon: Users, group: 'Navigate', action: () => router.push('/leads') },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban, group: 'Navigate', action: () => router.push('/pipeline') },
    { id: 'sequences', label: 'Sequences', icon: Zap, group: 'Navigate', action: () => router.push('/sequences') },
    { id: 'inbox', label: 'Inbox', icon: Inbox, group: 'Navigate', action: () => router.push('/inbox') },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Navigate', action: () => router.push('/analytics') },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'Navigate', action: () => router.push('/settings') },
    { id: 'pricing', label: 'Pricing', icon: CreditCard, group: 'Navigate', action: () => router.push('/pricing') },
    { id: 'activity', label: 'Activity Feed', icon: Activity, group: 'Navigate', action: () => router.push('/activity') },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, group: 'Navigate', action: () => router.push('/help') },
    { id: 'new-search', label: 'New Search', icon: Plus, shortcut: 'N', group: 'Actions', action: () => router.push('/search') },
    { id: 'new-sequence', label: 'New Sequence', icon: Plus, group: 'Actions', action: () => router.push('/sequences/new') },
  ]

  const filtered = query.trim()
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    acc[cmd.group] = acc[cmd.group] ?? []
    acc[cmd.group].push(cmd)
    return acc
  }, {})

  const run = useCallback((cmd: Command) => {
    setOpen(false)
    setQuery('')
    cmd.action()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="relative w-full max-w-lg bg-card rounded-xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center border-b px-4 py-3 gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:block text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">ESC</kbd>
        </div>

        {/* Commands */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No results</p>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group}>
                <div className="px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group}</span>
                </div>
                {cmds.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => run(cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">{cmd.shortcut}</kbd>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1.5 py-0.5 rounded border">⌘K</kbd> to toggle</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1.5 py-0.5 rounded border">↵</kbd> to select</span>
        </div>
      </div>
    </div>
  )
}
